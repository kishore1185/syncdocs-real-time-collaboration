import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Server as HttpServer, IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { parse as parseUrl } from 'url';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  fullName: string;
  documentId: string;
  pageId: string;
  roomId: string;
  isAlive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Gateway                                                            */
/* ------------------------------------------------------------------ */

@Injectable()
export class CollaborationGateway implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('CollaborationGateway');
  private wss!: WebSocketServer;
  private heartbeatTimer!: ReturnType<typeof setInterval>;

  /** roomId → set of sockets in that room */
  private rooms = new Map<string, Set<AuthenticatedSocket>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /* ---- lifecycle ------------------------------------------------- */

  onModuleInit() {
    const httpServer: HttpServer = this.adapterHost.httpAdapter.getHttpServer();

    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req, socket, head) => {
      const { pathname, query } = parseUrl(req.url ?? '', true);

      // Only handle our specific path
      if (pathname !== '/collaboration') {
        return; // let other upgrade handlers (if any) proceed
      }

      this.authenticate(req, query as Record<string, string>)
        .then(({ userId, fullName, documentId, pageId }) => {
          this.wss.handleUpgrade(req, socket, head, (ws) => {
            const sock = ws as AuthenticatedSocket;
            sock.userId = userId;
            sock.fullName = fullName;
            sock.documentId = documentId;
            sock.pageId = pageId;
            sock.roomId = `${documentId}:${pageId}`;
            sock.isAlive = true;

            this.wss.emit('connection', sock, req);
          });
        })
        .catch((err) => {
          this.log.warn(`WS auth rejected: ${err.message ?? err}`);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
        });
    });

    this.wss.on('connection', (ws: AuthenticatedSocket) => {
      this.handleConnection(ws);
    });

    // Heartbeat: detect dead sockets every 30s
    this.heartbeatTimer = setInterval(() => {
      for (const ws of this.wss.clients) {
        const sock = ws as AuthenticatedSocket;
        if (!sock.isAlive) {
          this.log.debug(`Heartbeat timeout: ${sock.userId} in ${sock.roomId}`);
          sock.terminate();
          continue;
        }
        sock.isAlive = false;
        sock.ping();
      }
    }, 30_000);

    this.log.log('Collaboration WebSocket gateway initialised on /collaboration');
  }

  onModuleDestroy() {
    clearInterval(this.heartbeatTimer);
    this.wss.close();
    this.rooms.clear();
  }

  /* ---- authentication -------------------------------------------- */

  private async authenticate(
    _req: IncomingMessage,
    query: Record<string, string>,
  ): Promise<{ userId: string; fullName: string; documentId: string; pageId: string }> {
    const token = query['token'];
    const documentId = query['documentId'];
    const pageId = query['pageId'];

    if (!token) throw new Error('Missing token');
    if (!documentId) throw new Error('Missing documentId');
    if (!pageId) throw new Error('Missing pageId');

    // Verify JWT
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token);
    } catch {
      throw new Error('Invalid or expired token');
    }

    // Look up user
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new Error('User not found');

    // Check document permission (viewer or above is sufficient to connect)
    const role = await this.permissionsService.roleFor(documentId, user._id.toString());
    if (!role) throw new Error('No access to this document');

    this.log.log(
      `Auth OK: user=${user.fullName} (${user._id}) doc=${documentId} page=${pageId} role=${role}`,
    );

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      documentId,
      pageId,
    };
  }

  /* ---- connection handling --------------------------------------- */

  private handleConnection(sock: AuthenticatedSocket) {
    // Join room
    if (!this.rooms.has(sock.roomId)) {
      this.rooms.set(sock.roomId, new Set());
    }
    this.rooms.get(sock.roomId)!.add(sock);

    const roomSize = this.rooms.get(sock.roomId)!.size;
    this.log.log(
      `Connected: user=${sock.fullName} room=${sock.roomId} (${roomSize} in room)`,
    );

    // Heartbeat pong
    sock.on('pong', () => {
      sock.isAlive = true;
    });

    // Message handling
    sock.on('message', (data, isBinary) => {
      if (isBinary) {
        // Forward Yjs binary sync messages to other clients in the room
        this.broadcastBinaryToRoom(sock.roomId, sock, data);
        return;
      }
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(sock, msg);
      } catch (err) {
        this.log.warn(`Bad message from ${sock.userId}: ${err}`);
      }
    });

    // Disconnect
    sock.on('close', () => {
      this.handleDisconnect(sock);
    });

    sock.on('error', (err) => {
      this.log.warn(`Socket error for ${sock.userId}: ${err.message}`);
    });
  }

  private handleDisconnect(sock: AuthenticatedSocket) {
    const room = this.rooms.get(sock.roomId);
    if (room) {
      room.delete(sock);
      if (room.size === 0) {
        this.rooms.delete(sock.roomId);
      }
    }

    const remaining = room?.size ?? 0;
    this.log.log(
      `Disconnected: user=${sock.fullName} room=${sock.roomId} (${remaining} remaining)`,
    );
  }

  /* ---- message handling ------------------------------------------ */

  private handleMessage(
    sender: AuthenticatedSocket,
    msg: { type: string; payload?: unknown },
  ) {
    switch (msg.type) {
      case 'collaboration:test': {
        const testPayload = msg.payload as { message?: string } | undefined;
        this.log.log(
          `Test message from ${sender.fullName} in ${sender.roomId}: "${testPayload?.message ?? ''}"`,
        );

        // Broadcast to OTHER sockets in the same room
        this.broadcastToRoom(sender.roomId, sender, {
          type: 'collaboration:test',
          payload: {
            message: testPayload?.message ?? '',
            from: sender.fullName,
            userId: sender.userId,
            timestamp: Date.now(),
          },
        });
        break;
      }

      default:
        this.log.warn(`Unknown message type from ${sender.userId}: ${msg.type}`);
    }
  }

  /* ---- broadcast ------------------------------------------------- */

  private broadcastToRoom(
    roomId: string,
    sender: AuthenticatedSocket | null,
    data: unknown,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const json = JSON.stringify(data);
    let sent = 0;

    for (const sock of room) {
      if (sender && sock === sender) continue; // exclude sender if provided
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(json);
        sent++;
      }
    }

    this.log.debug(`Broadcast in ${roomId}: sent to ${sent} peer(s)`);
  }

  public broadcastDocumentSystemEvent(documentId: string, type: string, payload: any, excludeUserId?: string) {
    const roomId = `${documentId}:system`;
    const room = this.rooms.get(roomId);
    if (!room) return;

    const json = JSON.stringify({ type, payload });
    for (const sock of room) {
      if (excludeUserId && sock.userId === excludeUserId) continue;
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(json);
      }
    }
  }

  private broadcastBinaryToRoom(
    roomId: string,
    sender: AuthenticatedSocket,
    data: WebSocket.RawData,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let sent = 0;
    for (const sock of room) {
      if (sock === sender) continue;
      if (sock.readyState === WebSocket.OPEN) {
        sock.send(data, { binary: true });
        sent++;
      }
    }
  }
}
