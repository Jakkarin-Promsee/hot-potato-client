import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { useNavigate } from "react-router-dom";
import {
  useLearningHistoryStore,
  type LearningHistoryEntry,
} from "@/stores/learningHistory.store";
import { formatAuthorLine } from "@/lib/formatAuthors";

function authorWithRelativeTime(row: LearningHistoryEntry): string {
  const names = formatAuthorLine(
    row.content.author_name,
    row.content.collaborator_names,
  );
  const rel = formatRelative(row.last_accessed);
  return names ? `${names} · ${rel}` : rel;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function groupByDate(
  entries: LearningHistoryEntry[],
): Record<string, LearningHistoryEntry[]> {
  const groups: Record<string, LearningHistoryEntry[]> = {};
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  for (const entry of entries) {
    const d = new Date(entry.last_accessed);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString())
      label = "Yesterday";
    else
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label]!.push(entry);
  }
  return groups;
}

export default function History() {
  const navigate = useNavigate();
  const { entries, isLoading, error, fetchHistory } = useLearningHistoryStore();

  useEffect(() => {
    fetchHistory(100);
  }, [fetchHistory]);

  const grouped = useMemo(() => groupByDate(entries), [entries]);

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <h1 className="font-serif text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your learning journey, sorted by time
      </p>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading && entries.length === 0 ? (
        <div className="mt-16 flex justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading history…
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          No history yet. Open a lesson from Explore or your library — it will
          appear here.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([label, rows]) => (
            <div key={label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {rows.map((row) => (
                  <div key={row._id} className="relative">
                    <ContentCard
                      title={row.content.title}
                      coverUrl={row.content.title_image || undefined}
                      topics={row.content.topics}
                      author={authorWithRelativeTime(row)}
                      onClick={() => navigate(`/view/${row.content._id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
