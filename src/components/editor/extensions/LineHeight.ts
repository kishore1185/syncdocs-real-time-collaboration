import { Extension } from '@tiptap/react';

export interface LineHeightOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes['lineHeight']) {
                return {};
              }
              return {
                style: `line-height: ${attributes['lineHeight']}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ commands }) => {
        let updated = false;
        if (commands.updateAttributes('paragraph', { lineHeight })) updated = true;
        if (commands.updateAttributes('heading', { lineHeight })) updated = true;
        return updated;
      },
      unsetLineHeight: () => ({ commands }) => {
        let updated = false;
        if (commands.updateAttributes('paragraph', { lineHeight: null })) updated = true;
        if (commands.updateAttributes('heading', { lineHeight: null })) updated = true;
        return updated;
      },
    };
  },
});
