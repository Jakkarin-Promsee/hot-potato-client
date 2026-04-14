import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { Link, useNavigate } from "react-router-dom";
import { useContentStore } from "@/stores/content.store";

const TABS = ["All", "Bookmarked", "Recent"] as const;

const mockHistory = [
  {
    id: "h1",
    title: "Understanding Derivatives Intuitively",
    topics: ["slope", "limit"],
    author: "Ms. Chen",
  },
  {
    id: "h2",
    title: "How Electricity Really Works",
    topics: ["current", "voltage"],
    author: "Mr. Park",
  },
  {
    id: "h3",
    title: "The Logic Behind Recursion",
    topics: ["stack", "base case"],
    author: "Dr. Kim",
  },
  {
    id: "h4",
    title: "Gravity: A Visual Journey",
    topics: ["force", "mass"],
    author: "Prof. Tanaka",
  },
  {
    id: "h5",
    title: "Why Music Sounds Good",
    topics: ["harmony", "frequency"],
    author: "Ms. Yamada",
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const { contents, fetchMyContents, searchContents } = useContentStore();

  useEffect(() => {
    fetchMyContents();
  }, [fetchMyContents]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.trim()) {
        searchContents(search);
      } else {
        fetchMyContents();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [search, searchContents, fetchMyContents]);

  const validContents = useMemo(
    () =>
      contents.filter(
        (c) =>
          Boolean(c?._id) && Boolean(c?.title && c.title.trim().length > 0),
      ),
    [contents],
  );

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayed =
    activeTab === "Bookmarked"
      ? validContents.filter((c) => bookmarks.has(c._id))
      : validContents;

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <h1 className="font-serif text-2xl font-bold">Explore</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Discover lessons crafted for understanding
      </p>

      {/* Continue learning – horizontal scroll */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Continue learning
          </h2>
          <Link
            to="/history"
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {mockHistory.map((c) => (
            <div key={c.id} className="w-48 shrink-0">
              <ContentCard
                title={c.title}
                topics={c.topics}
                author={c.author}
                onClick={() => {}}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {displayed.map((c) => (
          <ContentCard
            key={c._id}
            title={c.title}
            coverUrl={c.title_image}
            bookmarked={bookmarks.has(c._id)}
            onBookmark={() => toggleBookmark(c._id)}
            onClick={() => navigate(`/view/${c._id}`)}
          />
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          {activeTab === "Bookmarked"
            ? "No bookmarked lessons yet."
            : "No lessons found."}
        </div>
      )}
    </div>
  );
}
