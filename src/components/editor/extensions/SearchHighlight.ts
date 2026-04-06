import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const searchHighlightKey = new PluginKey("searchHighlight");

export interface SearchMatch {
  from: number;
  to: number;
}

export function findMatches(doc: any, searchTerm: string): SearchMatch[] {
  if (!searchTerm) return [];
  const matches: SearchMatch[] = [];
  const term = searchTerm.toLowerCase();

  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    let idx = text.indexOf(term);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + term.length });
      idx = text.indexOf(term, idx + 1);
    }
  });

  return matches;
}

export const SearchHighlightExtension = Extension.create({
  name: "searchHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init() {
            return {
              searchTerm: "",
              currentIndex: 0,
              matches: [] as SearchMatch[],
            };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(searchHighlightKey);
            if (meta !== undefined) return meta;
            return prev;
          },
        },
        props: {
          decorations(state) {
            const { searchTerm, matches, currentIndex } =
              searchHighlightKey.getState(state);
            if (!searchTerm || !matches.length) return DecorationSet.empty;

            const decorations = matches.map((match: SearchMatch, i: number) =>
              Decoration.inline(match.from, match.to, {
                class:
                  i === currentIndex
                    ? "search-highlight-current"
                    : "search-highlight",
              }),
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
