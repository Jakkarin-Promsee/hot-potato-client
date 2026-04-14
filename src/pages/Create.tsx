import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { useContentStore } from "@/stores/content.store";
import { useNavigate } from "react-router-dom";

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const {
    contents,
    isLoading,
    fetchMyContents,
    searchContents,
    createContent,
  } = useContentStore();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

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

  const visibleContents = useMemo(
    () =>
      contents.filter(
        (c) => Boolean(c?._id) && Boolean(c?.title && c.title.trim().length > 0),
      ),
    [contents],
  );

  const handleCreate = async () => {
    setCreating(true);
    const contentId = await createContent();
    setCreating(false);
    navigate(`/canvas/${contentId}`);
  };

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Your Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleContents.length} lessons created
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {creating ? "Creating..." : "New Lesson"}
          </span>
        </Button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your lessons..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {visibleContents.map((c) => (
          <ContentCard
            key={c._id}
            title={c.title}
            coverUrl={c.title_image}
            onClick={() => navigate(`/canvas/${c._id}`)}
          />
        ))}
      </div>

      {!isLoading && visibleContents.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            {search
              ? "No lessons match your search."
              : "You haven't created any lessons yet."}
          </p>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            <Plus className="mr-1 h-4 w-4" /> Create your first lesson
          </Button>
        </div>
      )}
    </div>
  );
}
