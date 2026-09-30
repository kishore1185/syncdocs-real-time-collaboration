import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { API_BASE, tokenStore } from '../../../lib/api';

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number, x?: number, y?: number, borderStyle?: string, borderWidth?: string, borderColor?: string }) => ReturnType;
    };
  }
}

const ResizableImageNodeView = (props: any) => {
  const { node, updateAttributes, selected, deleteNode, getPos, editor } = props;
  const { src, alt, title, width, height, x, y, borderStyle, borderWidth, borderColor } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  
  const [localSize, setLocalSize] = useState({ width, height });
  const [localPos, setLocalPos] = useState({ x: x ?? 96, y: y ?? 96 });
  
  const startPos = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0, x: 0, y: 0 });
  const currentDragState = useRef({ w: 0, h: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!isResizing && !isMoving) {
      setLocalSize({ width: node.attrs.width, height: node.attrs.height });
      setLocalPos({ x: node.attrs.x ?? 96, y: node.attrs.y ?? 96 });
    }
  }, [node.attrs.width, node.attrs.height, node.attrs.x, node.attrs.y, isResizing, isMoving]);

  const handleResizeDown = useCallback((e: React.PointerEvent, direction: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startW = containerRef.current?.offsetWidth || width || 20;
    const startH = containerRef.current?.offsetHeight || height || 20;
    const startX = localPos.x;
    const startY = localPos.y;

    startPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: startW,
      h: startH,
      x: startX,
      y: startY,
    };
    
    currentDragState.current = { w: startW, h: startH, x: startX, y: startY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startPos.current.mouseX;
      const dy = moveEvent.clientY - startPos.current.mouseY;
      
      const aspectRatio = startPos.current.w / startPos.current.h;
      
      const signX = direction.includes('right') ? 1 : -1;
      const signY = direction.includes('bottom') ? 1 : -1;
      
      const dxScaled = dx * signX;
      const dyScaled = dy * signY * aspectRatio;
      
      const move = Math.abs(dxScaled) > Math.abs(dyScaled) ? dxScaled : dyScaled;
      
      let newWidth = startPos.current.w + move;
      if (newWidth < 20) newWidth = 20;
      let newHeight = newWidth / aspectRatio;

      let newX = startPos.current.x;
      let newY = startPos.current.y;

      if (direction.includes('left')) {
        newX = startPos.current.x + (startPos.current.w - newWidth);
      }
      if (direction.includes('top')) {
        newY = startPos.current.y + (startPos.current.h - newHeight);
      }

      currentDragState.current = { w: newWidth, h: newHeight, x: newX, y: newY };
      setLocalSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      setLocalPos({ x: Math.round(newX), y: Math.round(newY) });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      setIsResizing(false);
      updateAttributes({ 
        width: Math.round(currentDragState.current.w), 
        height: Math.round(currentDragState.current.h),
        x: Math.round(currentDragState.current.x),
        y: Math.round(currentDragState.current.y)
      });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [updateAttributes, width, height, localPos.x, localPos.y]);

  const handleBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    if (typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }

    setIsMoving(true);
    
    const startW = localSize.width || width || 20;
    const startH = localSize.height || height || 20;
    
    startPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: startW,
      h: startH,
      x: localPos.x,
      y: localPos.y,
    };
    
    currentDragState.current = {
      w: startW,
      h: startH,
      x: localPos.x,
      y: localPos.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startPos.current.mouseX;
      const dy = moveEvent.clientY - startPos.current.mouseY;
      
      let newX = startPos.current.x + dx;
      let newY = startPos.current.y + dy;
      
      const pageEl = containerRef.current?.closest('.relative') as HTMLElement;
      if (pageEl) {
        const maxW = pageEl.clientWidth - startPos.current.w;
        const maxH = pageEl.clientHeight - startPos.current.h;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > maxW) newX = maxW;
        if (newY > maxH) newY = maxH;
      } else {
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
      }

      currentDragState.current.x = newX;
      currentDragState.current.y = newY;
      setLocalPos({ x: newX, y: newY });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      setIsMoving(false);
      updateAttributes({ 
        x: Math.round(currentDragState.current.x), 
        y: Math.round(currentDragState.current.y) 
      });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [getPos, editor, localPos.x, localPos.y, localSize.width, localSize.height, width, height, updateAttributes]);

  const displayWidth = isResizing ? localSize.width : width;
  const displayHeight = isResizing ? localSize.height : height;
  const displayX = (isMoving || isResizing) ? localPos.x : (x ?? 96);
  const displayY = (isMoving || isResizing) ? localPos.y : (y ?? 96);

  let displaySrc = src;
  if (src && src.startsWith('/api/images')) {
    const origin = API_BASE.replace(/\/api$/, '');
    displaySrc = `${origin}${src}?token=${tokenStore.get() || ''}`;
  }

  return (
    <NodeViewWrapper 
      as="div" 
      className={`absolute ${selected || isResizing || isMoving ? 'ring-2 ring-indigo-500 z-50' : 'z-10'}`}
      style={{ 
        width: displayWidth ? `${displayWidth}px` : 'auto', 
        height: displayHeight ? `${displayHeight}px` : 'auto',
        left: `${displayX}px`,
        top: `${displayY}px`,
      }}
      ref={containerRef}
      onPointerDown={handleBodyPointerDown}
    >
      <img 
        src={displaySrc} 
        alt={alt} 
        title={title}
        width={width ?? undefined}
        height={height ?? undefined}
        data-x={x ?? 96}
        data-y={y ?? 96}
        style={{
          borderStyle: borderStyle && borderStyle !== 'none' ? borderStyle : undefined,
          borderWidth: borderWidth && borderWidth !== '0px' ? borderWidth : undefined,
          borderColor: borderColor && borderColor !== 'transparent' ? borderColor : undefined,
        }}
        className="block w-full h-full object-contain select-none" 
        draggable={false} 
      />
      
      {(selected || isResizing || isMoving) && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 text-white rounded-md shadow-sm hover:bg-red-500 transition-colors z-20"
            title="Delete image"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>

          <div 
            className="absolute top-0 left-0 w-3 h-3 bg-white border border-indigo-500 -translate-x-1.5 -translate-y-1.5 cursor-nwse-resize z-30"
            onPointerDown={(e) => handleResizeDown(e, 'top-left')}
          />
          <div 
            className="absolute top-0 right-0 w-3 h-3 bg-white border border-indigo-500 translate-x-1.5 -translate-y-1.5 cursor-nesw-resize z-30"
            onPointerDown={(e) => handleResizeDown(e, 'top-right')}
          />
          <div 
            className="absolute bottom-0 left-0 w-3 h-3 bg-white border border-indigo-500 -translate-x-1.5 translate-y-1.5 cursor-nesw-resize z-30"
            onPointerDown={(e) => handleResizeDown(e, 'bottom-left')}
          />
          <div 
            className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-indigo-500 translate-x-1.5 translate-y-1.5 cursor-nwse-resize z-30"
            onPointerDown={(e) => handleResizeDown(e, 'bottom-right')}
          />
        </>
      )}
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'resizableImage',
  inline: false,
  group: 'block',
  draggable: false,

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const w = element.getAttribute('width');
          if (!w) return null;
          const parsed = parseInt(w, 10);
          return isNaN(parsed) ? null : parsed;
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const h = element.getAttribute('height');
          if (!h) return null;
          const parsed = parseInt(h, 10);
          return isNaN(parsed) ? null : parsed;
        },
      },
      x: {
        default: 96,
        parseHTML: element => {
          const x = element.getAttribute('data-x');
          if (!x) return 96;
          const parsed = parseInt(x, 10);
          return isNaN(parsed) ? 96 : parsed;
        },
        renderHTML: attributes => {
          return { 'data-x': attributes['x'] };
        },
      },
      y: {
        default: 96,
        parseHTML: element => {
          const y = element.getAttribute('data-y');
          if (!y) return 96;
          const parsed = parseInt(y, 10);
          return isNaN(parsed) ? 96 : parsed;
        },
        renderHTML: attributes => {
          return { 'data-y': attributes['y'] };
        },
      },
      borderStyle: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-border-style') || 'none',
        renderHTML: attributes => ({ 'data-border-style': attributes['borderStyle'] }),
      },
      borderWidth: {
        default: '0px',
        parseHTML: element => element.getAttribute('data-border-width') || '0px',
        renderHTML: attributes => ({ 'data-border-width': attributes['borderWidth'] }),
      },
      borderColor: {
        default: 'transparent',
        parseHTML: element => element.getAttribute('data-border-color') || 'transparent',
        renderHTML: attributes => ({ 'data-border-color': attributes['borderColor'] }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },

  addCommands() {
    return {
      setResizableImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { ...options, x: 96, y: 96 },
        });
      },
    };
  },
});
