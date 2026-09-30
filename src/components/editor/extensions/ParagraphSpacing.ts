import { Extension } from '@tiptap/react';

export interface ParagraphSpacingOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (options: { marginTop?: string; marginBottom?: string }) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: 'paragraphSpacing',

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
          marginTop: {
            default: null,
            parseHTML: element => element.style.marginTop || null,
            renderHTML: attributes => {
              if (!attributes['marginTop']) {
                return {};
              }
              return {
                style: `margin-top: ${attributes['marginTop']}`,
              };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: element => element.style.marginBottom || null,
            renderHTML: attributes => {
              if (!attributes['marginBottom']) {
                return {};
              }
              return {
                style: `margin-bottom: ${attributes['marginBottom']}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing: (options) => ({ commands }) => {
        let updated = false;
        if (commands.updateAttributes('paragraph', options)) updated = true;
        if (commands.updateAttributes('heading', options)) updated = true;
        return updated;
      },
      unsetParagraphSpacing: () => ({ commands }) => {
        let updated = false;
        if (commands.updateAttributes('paragraph', { marginTop: null, marginBottom: null })) updated = true;
        if (commands.updateAttributes('heading', { marginTop: null, marginBottom: null })) updated = true;
        return updated;
      },
    };
  },
});
