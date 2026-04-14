import { Plus } from "lucide-react";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";

// Mock data
const myContent = [
  {
    id: "1",
    title: "Understanding Derivatives Intuitively",
    status: "published" as const,
  },
  { id: "2", title: "How Electricity Really Works", status: "draft" as const },
  {
    id: "3",
    title: "The Logic Behind Recursion",
    status: "published" as const,
  },
];

export default function CreatorDashboard() {
  return (
    <div className="container px-4 pb-24 pt-6 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Your Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {myContent.length} lessons created
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Lesson</span>
        </Button>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {myContent.map((c) => (
          <div key={c.id} className="relative">
            <ContentCard
              title={c.title}
              onClick={() => {
                /* navigate to /create/:id */
              }}
            />
            <span
              className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                c.status === "published"
                  ? "bg-success/20 text-success"
                  : "bg-warning/20 text-warning"
              }`}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>

      {myContent.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            You haven't created any lessons yet.
          </p>
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Create your first lesson
          </Button>
        </div>
      )}
    </div>
  );
}
