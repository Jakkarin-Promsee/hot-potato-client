import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./indexTiptap.css";
import App from "./App";
import { useLanguageStore } from "./stores/language.store";

// Eagerly initialize language so <html lang> is accurate for browser translation.
useLanguageStore.getState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
