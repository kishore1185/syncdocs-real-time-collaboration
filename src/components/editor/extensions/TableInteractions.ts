import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TableInteractions = Extension.create({
  name: 'tableInteractions',

  addProseMirrorPlugins() {
    let isResizingRow = false;
    let startY = 0;
    let startHeight = 0;
    let resizingRowElement: HTMLTableRowElement | null = null;
    let resizingRowPos = -1;

    return [
      new Plugin({
        key: new PluginKey('tableInteractions'),
        props: {
          handleDrop: (view, event, slice, moved) => {
            // Prevent duplication of tables during drag and drop
            // If moved is false, it means the browser is trying to copy the content
            // We force it to move if it contains a table.
            let hasTable = false;
            slice.content.descendants((node) => {
              if (node.type.name === 'table') hasTable = true;
            });

            if (hasTable && !moved) {
              // This was a drag-and-drop that tried to copy the table (e.g. holding Ctrl)
              // We prevent it to avoid accidental duplication.
              event.preventDefault();
              return true; 
            }
            return false;
          },
          
          handleDOMEvents: {
            dragstart: (view, event) => {
              // Make sure the table itself can be dragged cleanly
              const target = event.target as HTMLElement;
              if (target.tagName === 'TABLE' || target.closest('table')) {
                // Let ProseMirror handle the native dragstart, which sets up the slice
              }
              return false;
            },

            pointermove: (view, event) => {
              const target = event.target as HTMLElement;
              
              if (isResizingRow && resizingRowElement) {
                const dy = event.clientY - startY;
                let newHeight = startHeight + dy;
                if (newHeight < 24) newHeight = 24; // Sensible minimum row height
                resizingRowElement.style.height = `${newHeight}px`;
                return true;
              }

              // Normal hover logic: check if near bottom border of td/th
              if (!isResizingRow) {
                if (target.tagName === 'TD' || target.tagName === 'TH') {
                  const rect = target.getBoundingClientRect();
                  const isNearBottom = event.clientY > rect.bottom - 8;
                  if (isNearBottom) {
                    target.style.cursor = 'row-resize';
                  } else {
                    target.style.cursor = 'text'; // default text cursor inside cells
                  }
                }
              }
              
              return false;
            },
            
            pointerdown: (view, event) => {
              const target = event.target as HTMLElement;
              
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                const rect = target.getBoundingClientRect();
                const isNearBottom = event.clientY > rect.bottom - 8;
                
                if (isNearBottom) {
                  isResizingRow = true;
                  startY = event.clientY;
                  resizingRowElement = target.parentElement as HTMLTableRowElement;
                  startHeight = resizingRowElement.getBoundingClientRect().height;
                  
                  // Find the ProseMirror position of this tr node
                  const pos = view.posAtDOM(resizingRowElement, 0);
                  resizingRowPos = pos;
                  
                  event.preventDefault();
                  
                  const onPointerMove = (e: PointerEvent) => {
                     const dy = e.clientY - startY;
                     let newHeight = startHeight + dy;
                     if (newHeight < 24) newHeight = 24;
                     if (resizingRowElement) resizingRowElement.style.height = `${newHeight}px`;
                  };

                  const onPointerUp = () => {
                    isResizingRow = false;
                    if (resizingRowPos > -1 && resizingRowElement) {
                      const finalHeight = parseFloat(resizingRowElement.style.height);
                      // In ProseMirror, posAtDOM for a TR gives the position inside the TR.
                      // We need the position of the TR node itself, which is pos - 1 usually.
                      const trPos = resizingRowPos - 1;
                      const trNode = view.state.doc.nodeAt(trPos);
                      if (trNode && trNode.type.name === 'tableRow') {
                        view.dispatch(view.state.tr.setNodeMarkup(trPos, null, {
                          ...trNode.attrs,
                          height: `${finalHeight}px`
                        }));
                      }
                    }
                    resizingRowElement = null;
                    resizingRowPos = -1;
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                  };
                  
                  window.addEventListener('pointermove', onPointerMove);
                  window.addEventListener('pointerup', onPointerUp);
                  return true;
                }
              }
              return false;
            }
          }
        }
      })
    ];
  }
});
