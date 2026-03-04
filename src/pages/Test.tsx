import { useState } from "react";

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <header className="flex-shrink-0 h-12 bg-gray-900 text-white flex items-center px-4 gap-4 border-b border-gray-700 z-10">
      <span className="font-bold text-lg tracking-tight">MyApp</span>
      <nav className="flex gap-3 text-sm text-gray-300 ml-4">
        <button className="hover:text-white transition-colors">File</button>
        <button className="hover:text-white transition-colors">Edit</button>
        <button className="hover:text-white transition-colors">View</button>
      </nav>
      <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
        <span>user@example.com</span>
      </div>
    </header>
  );
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
function LeftSidebar() {
  const items = ["Pages", "Components", "Assets", "Layers", "Plugins"];
  const [active, setActive] = useState("Pages");

  return (
    <aside className="flex-shrink-0 w-52 bg-gray-800 text-gray-200 flex flex-col border-r border-gray-700 overflow-y-auto">
      <div className="px-3 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Navigator
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            className={`text-left px-3 py-2 rounded text-sm transition-colors ${
              active === item
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-700 text-gray-300"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ─── Right Properties Panel ───────────────────────────────────────────────────
function RightPanel() {
  return (
    <aside className="flex-shrink-0 w-60 bg-gray-800 text-gray-200 flex flex-col border-l border-gray-700 overflow-y-auto">
      <div className="px-3 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Properties
      </div>
      <div className="px-3 flex flex-col gap-4">
        {/* Position */}
        <section>
          <p className="text-xs text-gray-400 mb-2">Position</p>
          <div className="grid grid-cols-2 gap-2">
            {["X", "Y", "W", "H"].map((label) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{label}</label>
                <input
                  defaultValue="0"
                  className="bg-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Fill */}
        <section>
          <p className="text-xs text-gray-400 mb-2">Fill</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 border border-gray-600" />
            <input
              defaultValue="#3B82F6"
              className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Opacity */}
        <section>
          <p className="text-xs text-gray-400 mb-2">Opacity</p>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="100"
            className="w-full accent-blue-500"
          />
        </section>
      </div>
    </aside>
  );
}

// ─── Center Content (scrollable) ──────────────────────────────────────────────
function CenterContent() {
  // Generate fake content blocks to demonstrate scrolling
  const blocks = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    // ✅ KEY: flex-1 makes it fill remaining width
    //        overflow-y-auto makes ONLY this panel scroll
    <main className="flex-1  bg-gray-100 p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        Canvas / Content Area
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        ↕ Only this area scrolls. The topbar, left sidebar, and right panel stay
        fixed.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {blocks.map((n) => (
          <div
            key={n}
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
          >
            <div className="h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded mb-3" />
            <p className="text-sm font-medium text-gray-700">Block {n}</p>
            <p className="text-xs text-gray-400 mt-1">
              Scroll down to see more blocks
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function Test() {
  return (
    <>
      {/* // ✅ h-screen: locks total height to viewport // ✅ overflow-hidden:
      prevents the PAGE itself from scrolling */}
      <div className="flex flex-col overflow-hidden">
        {/* Topbar — fixed at top, never scrolls */}
        <Topbar />

        {/* Body row — fills all remaining height */}
        {/* ✅ flex-1: takes up space below topbar */}
        {/* ✅ overflow-hidden: children manage their own scroll */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — fixed width, doesn't scroll with content */}
          <LeftSidebar />

          {/* Center — the ONLY scrollable area */}
          <CenterContent />

          {/* Right panel — fixed width, doesn't scroll with content */}
          <RightPanel />
        </div>
      </div>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Topbar — fixed at top, never scrolls */}
        <Topbar />

        {/* Body row — fills all remaining height */}
        {/* ✅ flex-1: takes up space below topbar */}
        {/* ✅ overflow-hidden: children manage their own scroll */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — fixed width, doesn't scroll with content */}
          <LeftSidebar />

          {/* Center — the ONLY scrollable area */}
          <CenterContent />

          {/* Right panel — fixed width, doesn't scroll with content */}
          <RightPanel />
        </div>
      </div>
    </>
  );
}
