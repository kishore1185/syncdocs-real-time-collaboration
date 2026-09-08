import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Page, PageDocument } from './schemas/page.schema';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { UsersService } from '../users/users.service';
import { DocumentEntity, DocumentEntityDocument } from '../documents/schemas/document.schema';

const LOCK_SALT_ROUNDS = 10;
/** Quiet period before a page edit is flushed to MongoDB. */
const AUTOSAVE_DEBOUNCE_MS = 1500;
/** Upper bound: even under continuous typing, persist at least this often. */
const AUTOSAVE_MAX_WAIT_MS = 10_000;

export type SaveStatus = 'saving' | 'saved';

export interface PageView {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  isLocked: boolean;
  lockedBy: { id: string; fullName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageSaveState {
  pageId: string;
  status: SaveStatus;
  lastSavedAt: Date | null;
}

interface PendingSave {
  content: string;
  ystate: Buffer | null;
  userId: string;
  documentId: string;
  timer: NodeJS.Timeout;
  firstQueuedAt: number;
}

@Injectable()
export class PagesService implements OnModuleDestroy {
  private readonly logger = new Logger(PagesService.name);
  /** pageId -> pending debounced write. MongoDB is persistence, not realtime transport. */
  private readonly pending = new Map<string, PendingSave>();
  /** pageId -> last time we actually persisted (used for "Last saved at"). */
  private readonly lastSaved = new Map<string, Date>();

  constructor(
    @InjectModel(Page.name) private readonly pageModel: Model<PageDocument>,
    @InjectModel(DocumentEntity.name) private readonly documentModel: Model<DocumentEntityDocument>,
    private readonly activityLogs: ActivityLogsService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------------------------------- CRUD

  async createFirstPage(documentId: Types.ObjectId): Promise<PageDocument> {
    return this.pageModel.create({ documentId, pageNumber: 1, content: '' });
  }

  async list(documentId: string): Promise<PageView[]> {
    const pages = await this.pageModel
      .find({ documentId: new Types.ObjectId(documentId) })
      .sort({ pageNumber: 1 })
      .exec();
    return this.toViews(pages);
  }

  async get(documentId: string, pageId: string): Promise<PageView> {
    const page = await this.findOwned(documentId, pageId);
    return (await this.toViews([page]))[0];
  }

  /** Appends a page at the end (pageNumber = max + 1). Safe under concurrency via the unique index. */
  async create(documentId: string, userId: string): Promise<PageView> {
    const docId = new Types.ObjectId(documentId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const last = await this.pageModel.findOne({ documentId: docId }).sort({ pageNumber: -1 }).exec();
      const pageNumber = (last?.pageNumber ?? 0) + 1;
      try {
        const page = await this.pageModel.create({ documentId: docId, pageNumber, content: '' });
        void this.activityLogs.record({
          documentId,
          userId,
          pageId: page._id,
          action: 'PAGE_CREATED',
          details: `Added page ${pageNumber}`,
        });
        return (await this.toViews([page]))[0];
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    throw new ConflictException('Could not add a page right now. Please try again.');
  }

  async deleteAllForDocument(documentId: Types.ObjectId) {
    const pages = await this.pageModel.find({ documentId }, { _id: 1 }).exec();
    for (const p of pages) this.cancelPending(p._id.toString());
    await this.pageModel.deleteMany({ documentId }).exec();
  }

  // ------------------------------------------------------------ AUTOSAVE

  /**
   * Queues a debounced write. Returns immediately with status "saving";
   * the actual MongoDB write happens after a quiet period.
   */
  async queueContent(
    documentId: string,
    pageId: string,
    userId: string,
    content: string,
    ystateBase64?: string,
  ): Promise<PageSaveState> {
    const page = await this.findOwned(documentId, pageId);
    if (page.isLocked) throw new ForbiddenException('This page is locked and read-only.');

    let ystate: Buffer | null = null;
    if (ystateBase64) {
      try {
        ystate = Buffer.from(ystateBase64, 'base64');
      } catch {
        throw new BadRequestException('Invalid page state payload.');
      }
    }

    const existing = this.pending.get(pageId);
    if (existing) clearTimeout(existing.timer);
    const firstQueuedAt = existing?.firstQueuedAt ?? Date.now();
    const elapsed = Date.now() - firstQueuedAt;
    const delay = elapsed >= AUTOSAVE_MAX_WAIT_MS ? 0 : Math.min(AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_MAX_WAIT_MS - elapsed);

    this.pending.set(pageId, {
      content,
      ystate: ystate ?? existing?.ystate ?? null,
      userId,
      documentId,
      firstQueuedAt,
      timer: setTimeout(() => void this.flush(pageId), delay),
    });

    return { pageId, status: 'saving', lastSavedAt: this.lastSaved.get(pageId) ?? page.updatedAt ?? null };
  }

  /** Immediately persists any pending write (e.g. before lock, on tab close, on shutdown). */
  async flush(pageId: string): Promise<void> {
    const job = this.pending.get(pageId);
    if (!job) return;
    clearTimeout(job.timer);
    this.pending.delete(pageId);
    try {
      const update: Record<string, unknown> = { content: job.content };
      if (job.ystate) update.ystate = job.ystate;
      const now = new Date();
      const result = await this.pageModel
        .updateOne({ _id: new Types.ObjectId(pageId), isLocked: false }, { $set: update })
        .exec();
      if (result.matchedCount === 0) return; // locked or deleted meanwhile — drop silently
      this.lastSaved.set(pageId, now);
      await this.documentModel
        .updateOne({ _id: new Types.ObjectId(job.documentId) }, { $set: { lastSavedAt: now } })
        .exec();
      void this.activityLogs.record({
        documentId: job.documentId,
        userId: job.userId,
        pageId,
        action: 'PAGE_UPDATED',
      });
    } catch (error) {
      this.logger.error(`Autosave failed for page ${pageId}: ${(error as Error).message}`);
      // Re-queue once so a transient Atlas hiccup does not lose the edit.
      if (!this.pending.has(pageId)) {
        this.pending.set(pageId, { ...job, timer: setTimeout(() => void this.flush(pageId), AUTOSAVE_DEBOUNCE_MS * 2) });
      }
    }
  }

  async saveState(documentId: string, pageId: string): Promise<PageSaveState> {
    const page = await this.findOwned(documentId, pageId);
    return {
      pageId,
      status: this.pending.has(pageId) ? 'saving' : 'saved',
      lastSavedAt: this.lastSaved.get(pageId) ?? page.updatedAt ?? null,
    };
  }

  async documentSaveState(documentId: string): Promise<{ status: SaveStatus; lastSavedAt: Date | null }> {
    const pages = await this.pageModel.find({ documentId: new Types.ObjectId(documentId) }, { _id: 1, updatedAt: 1 }).exec();
    let saving = false;
    let last: Date | null = null;
    for (const p of pages) {
      const id = p._id.toString();
      if (this.pending.has(id)) saving = true;
      const t = this.lastSaved.get(id) ?? p.updatedAt ?? null;
      if (t && (!last || t > last)) last = t;
    }
    return { status: saving ? 'saving' : 'saved', lastSavedAt: last };
  }

  private cancelPending(pageId: string) {
    const job = this.pending.get(pageId);
    if (job) {
      clearTimeout(job.timer);
      this.pending.delete(pageId);
    }
    this.lastSaved.delete(pageId);
  }

  async onModuleDestroy() {
    const ids = [...this.pending.keys()];
    if (ids.length) this.logger.log(`Flushing ${ids.length} pending page save(s) before shutdown`);
    await Promise.all(ids.map((id) => this.flush(id)));
  }

  // ------------------------------------------------------------- LOCKING

  async lock(documentId: string, pageId: string, userId: string, password: string): Promise<PageView> {
    await this.flush(pageId); // never lock with unsaved edits in flight
    const lockPasswordHash = await bcrypt.hash(password, LOCK_SALT_ROUNDS);
    const page = await this.pageModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(pageId), documentId: new Types.ObjectId(documentId), isLocked: false },
        { $set: { isLocked: true, lockedBy: new Types.ObjectId(userId), lockPasswordHash } },
        { new: true },
      )
      .exec();
    if (!page) {
      const current = await this.findOwned(documentId, pageId);
      if (current.isLocked) throw new ConflictException('This page is already locked.');
      throw new NotFoundException('Page not found.');
    }
    void this.activityLogs.record({
      documentId,
      userId,
      pageId,
      action: 'PAGE_LOCKED',
      details: `Locked page ${page.pageNumber}`,
    });
    return (await this.toViews([page]))[0];
  }

  async unlock(documentId: string, pageId: string, userId: string, password: string): Promise<PageView> {
    const page = await this.findOwned(documentId, pageId);
    if (!page.isLocked || !page.lockPasswordHash) {
      throw new BadRequestException('This page is not locked.');
    }
    const ok = await bcrypt.compare(password, page.lockPasswordHash);
    if (!ok) throw new ForbiddenException('Incorrect lock password.');

    page.isLocked = false;
    page.lockedBy = null;
    page.lockPasswordHash = null;
    await page.save();

    void this.activityLogs.record({
      documentId,
      userId,
      pageId,
      action: 'PAGE_UNLOCKED',
      details: `Unlocked page ${page.pageNumber}`,
    });
    return (await this.toViews([page]))[0];
  }

  // ------------------------------------------------------------- helpers

  private async findOwned(documentId: string, pageId: string): Promise<PageDocument> {
    const page = await this.pageModel
      .findOne({ _id: new Types.ObjectId(pageId), documentId: new Types.ObjectId(documentId) })
      .exec();
    if (!page) throw new NotFoundException('Page not found.');
    return page;
  }

  /** Public shape: never includes lockPasswordHash or raw ystate. */
  private async toViews(pages: PageDocument[]): Promise<PageView[]> {
    const lockerIds = [...new Set(pages.filter((p) => p.lockedBy).map((p) => p.lockedBy!.toString()))];
    const users = lockerIds.length
      ? await this.usersService.findManyByIds(lockerIds.map((id) => new Types.ObjectId(id)))
      : [];
    const names = new Map(users.map((u) => [u._id.toString(), u.fullName]));
    return pages.map((p) => {
      const id = p._id.toString();
      return {
        id,
        documentId: p.documentId.toString(),
        pageNumber: p.pageNumber,
        content: this.pending.get(id)?.content ?? p.content,
        isLocked: p.isLocked,
        lockedBy: p.lockedBy
          ? { id: p.lockedBy.toString(), fullName: names.get(p.lockedBy.toString()) ?? 'A collaborator' }
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }
}
