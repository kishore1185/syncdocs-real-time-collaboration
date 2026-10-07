import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface CollaborationCursorOptions {
  provider: any;
  user: {
    name: string;
    color: string;
  };
}

export const CollaborationCursor = Extension.create<CollaborationCursorOptions>({
  name: 'collaborationCursor',

  addOptions() {
    return {
      provider: null,
      user: {
        name: 'Unknown',
        color: '#f783ac',
      },
    };
  },

  addProseMirrorPlugins() {
    const { provider, user } = this.options;
    if (!provider || !provider.awareness) {
      return [];
    }

    const awareness = provider.awareness;
    const pluginKey = new PluginKey('collaborationCursorPlugin');

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            // Map decorations through transactions (so they move when local user types)
            let set = oldSet.map(tr.mapping, tr.doc);

            const meta = tr.getMeta(pluginKey);
            if (meta && meta.type === 'updateDecorations') {
              const decorations: Decoration[] = [];
              const states = Array.from(awareness.getStates().entries()) as [number, any][];
              
              states.forEach(([clientId, state]) => {
                if (clientId === awareness.clientID) return; // Skip ourselves
                
                const remoteUser = state.user;
                const cursor = state.cursor;
                
                if (remoteUser && cursor) {
                  const { anchor, head } = cursor;
                  
                  // Ensure positions are within bounds
                  const docSize = tr.doc.content.size;
                  const validAnchor = Math.max(0, Math.min(anchor, docSize));
                  const validHead = Math.max(0, Math.min(head, docSize));

                  const from = Math.min(validAnchor, validHead);
                  const to = Math.max(validAnchor, validHead);

                  // 1. Draw selection if anchor != head
                  if (from !== to) {
                    decorations.push(
                      Decoration.inline(from, to, {
                        style: `background-color: ${remoteUser.color}40;`, // 25% opacity
                        class: 'collaboration-cursor__selection',
                      })
                    );
                  }

                  // 2. Draw caret at head
                  const caretElement = document.createElement('span');
                  caretElement.classList.add('collaboration-cursor__caret');
                  caretElement.style.borderColor = remoteUser.color;
                  caretElement.style.borderLeftColor = remoteUser.color;
                  caretElement.style.borderRightColor = remoteUser.color;

                  const labelElement = document.createElement('div');
                  labelElement.classList.add('collaboration-cursor__label');
                  labelElement.style.backgroundColor = remoteUser.color;
                  labelElement.innerText = remoteUser.name || 'Unknown';
                  caretElement.appendChild(labelElement);

                  decorations.push(
                    Decoration.widget(validHead, caretElement, {
                      key: `cursor-${clientId}`,
                      side: 1, // Draw after text at this position
                    })
                  );
                }
              });
              
              set = DecorationSet.create(tr.doc, decorations);
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state);
          },
        },
        view(editorView) {
          // Listen to awareness changes and dispatch a transaction to update decorations
          const updateDecorations = () => {
            if (!editorView.isDestroyed) {
              const tr = editorView.state.tr.setMeta(pluginKey, { type: 'updateDecorations' });
              editorView.dispatch(tr);
            }
          };

          awareness.on('change', updateDecorations);

          // Force initial render
          updateDecorations();

          return {
            update(view, prevState) {
              // Whenever local selection changes, publish it
              const { selection } = view.state;
              if (prevState && prevState.selection.eq(selection)) {
                return;
              }

              // Update awareness with local selection
              awareness.setLocalStateField('cursor', {
                anchor: selection.anchor,
                head: selection.head,
              });
            },
            destroy() {
              awareness.off('change', updateDecorations);
              awareness.setLocalStateField('cursor', null);
            },
          };
        },
      }),
    ];
  },
});
