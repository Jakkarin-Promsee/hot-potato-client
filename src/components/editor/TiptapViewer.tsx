import React, { useEffect, useRef, useState } from "react";
import { createEditorExtensions } from "./config/editorExtensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCanvasStore } from "@/stores/canvas.store";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.1;
const CONTENT_WIDTH = 600;
const PADDING = 40;
const MAX_DISPLAY_WIDTH = 500;
const CARD_PADDING = 40; // px-10 = 40px each side

function getInitialZoom() {
  const availableWidth = window.innerWidth - PADDING * 2;
  const targetWidth = Math.min(availableWidth, MAX_DISPLAY_WIDTH);
  return targetWidth / CONTENT_WIDTH;
}

type TiptapViewerProps = {
  onScrollDirectionChange?: (direction: "up" | "down") => void;
};

function TiptapViewer({ onScrollDirectionChange }: TiptapViewerProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(getInitialZoom);

  const { tiptapJson } = useCanvasStore();

  const editor = useEditor({
    extensions: createEditorExtensions(true),
    editable: false,
    content: tiptapJson && tiptapJson !== "{}" ? JSON.parse(tiptapJson) : "",
  });

  // Set content once editor + data are ready
  useEffect(() => {
    if (editor && tiptapJson && tiptapJson !== "{}") {
      editor.commands.setContent(JSON.parse(tiptapJson));
    }
  }, [editor, tiptapJson]);

  // ── Fit to viewport on resize ─────────────────────────────────────────────
  useEffect(() => {
    const updateZoom = () => {
      const availableWidth = window.innerWidth - PADDING * 2;
      const targetWidth = Math.min(availableWidth, MAX_DISPLAY_WIDTH);
      setZoom(targetWidth / CONTENT_WIDTH);
    };
    window.addEventListener("resize", updateZoom);
    return () => window.removeEventListener("resize", updateZoom);
  }, []);

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const next = Math.round((prev + delta) * 100) / 100;
        return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Detect reading direction on the scroll container itself.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || !onScrollDirectionChange) return;

    let lastScrollTop = 0;
    const MIN_DELTA = 6;

    const onScroll = () => {
      const current = el.scrollTop;
      const delta = current - lastScrollTop;
      if (Math.abs(delta) < MIN_DELTA) return;

      onScrollDirectionChange(delta > 0 ? "down" : "up");
      lastScrollTop = current;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollDirectionChange]);

  // ── Ctrl +/- keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((prev) =>
          Math.min(ZOOM_MAX, Math.round((prev + 0.25) * 100) / 100),
        );
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) =>
          Math.max(ZOOM_MIN, Math.round((prev - 0.25) * 100) / 100),
        );
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(getInitialZoom()); // reset to fit, not hardcoded 1.0
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="editor-layout editor-layout--viewer">
      <main ref={mainRef} className="editor-main">
        <div
          style={{
            width: `${CONTENT_WIDTH + CARD_PADDING * 2}px`, // 680px
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            marginLeft: `calc((100vw - ${
              CONTENT_WIDTH + CARD_PADDING * 2
            }px * ${zoom}) / 2)`,
          }}
          className="w-fit mx-auto editor-card shadow-sm"
        >
          <div className="editor-card shadow-sm">
            <div
              className="tiptap-editor mx-auto py-8"
              style={{ width: "600px" }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TiptapViewer;
