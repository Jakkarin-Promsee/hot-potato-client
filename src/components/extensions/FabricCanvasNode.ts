import { Node, mergeAttributes } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import FabricCanvasView from "./FabricCanvasView";

export const FabricCanvasNode = Node.create({
  name: "fabricCanvas",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      canvasData: {
        default: "{}",
      },
      width: {
        default: 680,
      },
      height: {
        default: 400,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-fabric-canvas]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-fabric-canvas": "" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FabricCanvasView);
  },
});
