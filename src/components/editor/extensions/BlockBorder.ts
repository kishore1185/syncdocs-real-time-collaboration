import { Extension } from '@tiptap/react';

export interface BlockBorderOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockBorder: {
      setBlockBorder: (options: { style: string; thickness: string; color?: string }) => ReturnType;
      unsetBlockBorder: () => ReturnType;
    };
  }
}

export const BlockBorder = Extension.create<BlockBorderOptions>({
  name: 'blockBorder',

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
          borderStyle: {
            default: null,
            parseHTML: element => element.style['borderStyle'],
            renderHTML: attributes => {
              if (!attributes['borderStyle']) {
                return {};
              }
              return {
                style: `border-style: ${attributes['borderStyle']}`,
              };
            },
          },
          borderWidth: {
            default: null,
            parseHTML: element => element.style['borderWidth'],
            renderHTML: attributes => {
              if (!attributes['borderWidth']) {
                return {};
              }
              return {
                style: `border-width: ${attributes['borderWidth']}`,
              };
            },
          },
          borderColor: {
            default: null,
            parseHTML: element => element.style['borderColor'],
            renderHTML: attributes => {
              if (!attributes['borderColor']) {
                return {};
              }
              return {
                style: `border-color: ${attributes['borderColor']}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockBorder: (options) => ({ commands }) => {
        const attrs = {
          borderStyle: options.style,
          borderWidth: options.thickness,
          borderColor: options.color || '#000000',
        };
        let updated = false;
        if (commands.updateAttributes('paragraph', attrs)) updated = true;
        if (commands.updateAttributes('heading', attrs)) updated = true;
        return updated;
      },
      unsetBlockBorder: () => ({ commands }) => {
        const attrs = {
          borderStyle: null,
          borderWidth: null,
          borderColor: null,
        };
        let updated = false;
        if (commands.updateAttributes('paragraph', attrs)) updated = true;
        if (commands.updateAttributes('heading', attrs)) updated = true;
        return updated;
      },
    };
  },
});
