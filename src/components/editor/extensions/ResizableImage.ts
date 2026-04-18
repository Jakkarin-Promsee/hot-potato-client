import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const IMAGE_RESIZE_PLUGIN_KEY = new PluginKey("imageResizeByMouse");
const EDGE_THRESHOLD_PX = 10;
const MIN_IMAGE_SIZE_PX = 48;

function clampSize(value: number) {
  return Math.max(MIN_IMAGE_SIZE_PX, Math.round(value));
}

function getImageNodePos(view: EditorView, imageEl: HTMLImageElement) {
  const directPos = view.posAtDOM(imageEl, 0);
  const directNode = view.state.doc.nodeAt(directPos);
  if (directNode?.type?.name === "image") return directPos;

  const beforeNode = view.state.doc.nodeAt(directPos - 1);
  if (beforeNode?.type?.name === "image") return directPos - 1;

  return null;
}

function startImageResize(
  view: EditorView,
  imageEl: HTMLImageElement,
  mouseEvent: MouseEvent,
  nearRight: boolean,
  nearBottom: boolean,
  onResize?: () => void,
) {
  const imagePos = getImageNodePos(view, imageEl);
  if (imagePos == null) return false;

  const imageNode = view.state.doc.nodeAt(imagePos);
  if (!imageNode || imageNode.type.name !== "image") return false;

  const rect = imageEl.getBoundingClientRect();
  const startX = mouseEvent.clientX;
  const startY = mouseEvent.clientY;
  const startWidth =
    typeof imageNode.attrs.width === "number" ? imageNode.attrs.width : rect.width;
  const startHeight =
    typeof imageNode.attrs.height === "number"
      ? imageNode.attrs.height
      : rect.height;

  const safeStartWidth = Math.max(startWidth, MIN_IMAGE_SIZE_PX);
  const safeStartHeight = Math.max(startHeight, MIN_IMAGE_SIZE_PX);
  const aspectRatio = safeStartWidth / safeStartHeight;

  let nextWidth = safeStartWidth;
  let nextHeight = safeStartHeight;

  const originalCursor = document.body.style.cursor;
  document.body.style.cursor =
    nearRight && nearBottom
      ? "nwse-resize"
      : nearRight
        ? "ew-resize"
        : "ns-resize";

  const onMouseMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;

    if (nearRight && nearBottom) {
      // Keep aspect ratio even for corner drag by using
      // whichever axis changed more as the driving dimension.
      if (Math.abs(dx) >= Math.abs(dy)) {
        nextWidth = clampSize(safeStartWidth + dx);
        nextHeight = clampSize(nextWidth / aspectRatio);
      } else {
        nextHeight = clampSize(safeStartHeight + dy);
        nextWidth = clampSize(nextHeight * aspectRatio);
      }
    } else if (nearRight) {
      nextWidth = clampSize(safeStartWidth + dx);
      nextHeight = clampSize(nextWidth / aspectRatio);
    } else {
      nextHeight = clampSize(safeStartHeight + dy);
      nextWidth = clampSize(nextHeight * aspectRatio);
    }

    imageEl.style.width = `${nextWidth}px`;
    imageEl.style.height = `${nextHeight}px`;
    onResize?.();
  };

  const onMouseUp = () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = originalCursor;

    const latestNode = view.state.doc.nodeAt(imagePos);
    const tr = view.state.tr.setNodeMarkup(imagePos, undefined, {
      ...(latestNode?.attrs ?? imageNode.attrs),
      width: nextWidth,
      height: nextHeight,
    });
    view.dispatch(tr);

    // Let node attrs control rendering after commit.
    imageEl.style.width = "";
    imageEl.style.height = "";
    onResize?.();
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp, { once: true });
  return true;
}

export function createResizableImage(editable: boolean) {
  return Image.configure({}).extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        "data-align": { default: "left" },
        "data-href": { default: null },
        width: { default: null },
        height: { default: null },
      };
    },

    addProseMirrorPlugins() {
      if (!editable) return [];

      return [
        new Plugin({
          key: IMAGE_RESIZE_PLUGIN_KEY,
          view(view) {
            const handleEl = document.createElement("button");
            handleEl.type = "button";
            handleEl.title = "Drag to resize image";
            handleEl.textContent = "↘";
            handleEl.setAttribute("aria-label", "Resize image");
            handleEl.style.position = "fixed";
            handleEl.style.width = "18px";
            handleEl.style.height = "18px";
            handleEl.style.border = "1px solid color-mix(in oklab, var(--color-border) 70%, transparent)";
            handleEl.style.borderRadius = "5px";
            handleEl.style.background = "color-mix(in oklab, var(--editor-surface) 90%, var(--color-muted) 10%)";
            handleEl.style.color = "var(--color-muted-foreground)";
            handleEl.style.fontSize = "11px";
            handleEl.style.lineHeight = "1";
            handleEl.style.cursor = "nwse-resize";
            handleEl.style.display = "none";
            handleEl.style.alignItems = "center";
            handleEl.style.justifyContent = "center";
            handleEl.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.18)";
            handleEl.style.zIndex = "60";
            handleEl.style.padding = "0";

            document.body.appendChild(handleEl);

            let selectedImage: HTMLImageElement | null = null;

            const updateHandlePosition = () => {
              selectedImage = view.dom.querySelector(
                "img.ProseMirror-selectednode",
              ) as HTMLImageElement | null;

              if (!selectedImage || !view.hasFocus()) {
                handleEl.style.display = "none";
                return;
              }

              const rect = selectedImage.getBoundingClientRect();
              handleEl.style.left = `${rect.right - 9}px`;
              handleEl.style.top = `${rect.bottom - 9}px`;
              handleEl.style.display = "flex";
            };

            const onHandleMouseDown = (event: MouseEvent) => {
              if (!selectedImage) return;
              event.preventDefault();
              event.stopPropagation();

              const started = startImageResize(
                view,
                selectedImage,
                event,
                true,
                true,
                updateHandlePosition,
              );
              if (!started) handleEl.style.display = "none";
            };

            handleEl.addEventListener("mousedown", onHandleMouseDown);
            window.addEventListener("scroll", updateHandlePosition, true);
            window.addEventListener("resize", updateHandlePosition);
            setTimeout(updateHandlePosition, 0);

            return {
              update() {
                updateHandlePosition();
              },
              destroy() {
                handleEl.removeEventListener("mousedown", onHandleMouseDown);
                window.removeEventListener("scroll", updateHandlePosition, true);
                window.removeEventListener("resize", updateHandlePosition);
                handleEl.remove();
              },
            };
          },
          props: {
            handleDOMEvents: {
              mousedown: (view, event) => {
                const mouseEvent = event as MouseEvent;
                const target = mouseEvent.target as HTMLElement | null;
                const imageEl = target?.closest("img");
                if (!(imageEl instanceof HTMLImageElement)) return false;

                const rect = imageEl.getBoundingClientRect();
                const nearRight =
                  mouseEvent.clientX >= rect.right - EDGE_THRESHOLD_PX;
                const nearBottom =
                  mouseEvent.clientY >= rect.bottom - EDGE_THRESHOLD_PX;

                if (!nearRight && !nearBottom) return false;
                mouseEvent.preventDefault();
                return startImageResize(
                  view,
                  imageEl,
                  mouseEvent,
                  nearRight,
                  nearBottom,
                );
              },
            },
          },
        }),
      ];
    },
  });
}
