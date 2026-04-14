import { ContentCard } from "@/components/ContentCard";

interface HistoryEntry {
  id: string;
  title: string;
  topics: string[];
  author: string;
  viewedAt: string;
}

const mockHistory: HistoryEntry[] = [
  {
    id: "1",
    title: "Understanding Derivatives Intuitively",
    topics: ["slope", "limit", "differentiation"],
    author: "Ms. Chen",
    viewedAt: "2026-04-12T14:30:00Z",
  },
  {
    id: "2",
    title: "How Electricity Really Works",
    topics: ["current", "voltage", "circuits"],
    author: "Mr. Park",
    viewedAt: "2026-04-12T09:15:00Z",
  },
  {
    id: "3",
    title: "The Logic Behind Recursion",
    topics: ["stack", "base case", "trees"],
    author: "Dr. Kim",
    viewedAt: "2026-04-11T20:45:00Z",
  },
  {
    id: "4",
    title: "Gravity: A Visual Journey",
    topics: ["force", "mass", "spacetime"],
    author: "Prof. Tanaka",
    viewedAt: "2026-04-10T16:00:00Z",
  },
  {
    id: "5",
    title: "Why Music Sounds Good",
    topics: ["harmony", "frequency", "intervals"],
    author: "Ms. Yamada",
    viewedAt: "2026-04-09T11:20:00Z",
  },
];

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

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const groups: Record<string, HistoryEntry[]> = {};
  for (const entry of entries) {
    const d = new Date(entry.viewedAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label]?.push(entry);
  }
  return groups;
}

export default function History() {
  const grouped = groupByDate(mockHistory);

  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <h1 className="font-serif text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your learning journey, sorted by time
      </p>

      {mockHistory.length === 0 ? (
        <div className="mt-16 text-center text-sm text-muted-foreground">
          No history yet. Start exploring!
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([label, entries]) => (
            <div key={label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {entries.map((c) => (
                  <ContentCard
                    key={c.id}
                    title={c.title}
                    topics={c.topics}
                    author={c.author}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
