import {
  BookOpen,
  PenSquare,
  Eye,
  Layers,
  Share2,
  Sparkles,
  MessageSquare,
  BarChart3,
} from "lucide-react";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
}

const features: Feature[] = [
  {
    icon: PenSquare,
    title: "Visual Lesson Editor",
    description:
      "Create long-form, manga-style lessons with a rich block editor.",
    detail:
      "Drag, drop, and arrange content freely to build intuitive visual narratives. Add images, diagrams, annotations, and flow layouts — all in a single, scrollable canvas designed for storytelling.",
  },
  {
    icon: Eye,
    title: "Immersive Viewer",
    description: "A distraction-free, full-screen reader for deep focus.",
    detail:
      "Students scroll through lessons in a cinema-like experience. The viewer hides all chrome so the content is the only thing that matters. Designed for mobile-first consumption.",
  },
  {
    icon: Sparkles,
    title: "Interactive Elements",
    description: "Embed quizzes, toggles, sliders, and micro-interactions.",
    detail:
      "Students learn by doing, not just reading. Teachers can place interactive checkpoints anywhere in the lesson to reinforce intuition and test understanding in-context.",
  },
  {
    icon: Layers,
    title: "Content Management",
    description: "Organize lessons with cover images, tags, and states.",
    detail:
      "Manage everything from your Creator Dashboard. Track drafts, published content, and analytics. Each lesson gets its own shareable link and metadata.",
  },
  {
    icon: BookOpen,
    title: "Explore & Discover",
    description: "Browse public lessons from all creators.",
    detail:
      "Bookmark favourites, search by topic, and find inspiration from the community. The explore feed surfaces quality content so students always have something new to learn.",
  },
  {
    icon: BarChart3,
    title: "Learning History",
    description: "Track every lesson you've viewed, sorted by time.",
    detail:
      "Your personal workspace to revisit and continue where you left off. History is grouped by day so you can see your learning patterns at a glance.",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description: "Publish publicly or keep lessons private.",
    detail:
      "Generate shareable links and let others view or remix your work. Control visibility per-lesson with simple privacy settings from the publish menu.",
  },
  {
    icon: MessageSquare,
    title: "Feedback & Comments",
    description: "Students leave reactions and comments on lessons.",
    detail:
      "Helping teachers iterate and improve their content over time. Inline feedback lets creators know exactly which parts resonate and which need rework.",
  },
];

export default function Guide() {
  return (
    <div className="pb-24 md:pb-12">
      {/* Hero */}
      <div className="container px-4 pt-12 text-center">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">
          What Intuita can do
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Everything you need to create, share, and learn through visual
          intuition.
        </p>
      </div>

      {/* Feature sections */}
      <div className="mt-16 space-y-0">
        {features.map((f, i) => {
          const isEven = i % 2 === 0;
          return (
            <section
              key={f.title}
              className={`border-t border-border ${isEven ? "bg-card/50" : "bg-background"}`}
            >
              <div className="container px-4 py-16 md:py-24">
                <div
                  className={`mx-auto flex max-w-3xl flex-col items-center gap-8 md:flex-row ${!isEven ? "md:flex-row-reverse" : ""}`}
                >
                  {/* Visual */}
                  <div className="flex w-full shrink-0 items-center justify-center md:w-1/2">
                    <div className="flex h-48 w-full max-w-xs items-center justify-center rounded-2xl border border-border text-muted-foreground from-primary/10 via-accent to-card sm:h-56">
                      <f.icon className="h-16 w-16 text-primary/60" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="w-full text-center md:w-1/2 md:text-left">
                    <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="mt-1 font-serif text-xl font-bold sm:text-2xl">
                      {f.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-foreground/80">
                      {f.description}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {f.detail}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="container px-4 py-16 text-center">
        <p className="font-serif text-lg font-semibold">Ready to start?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump into Explore or create your first lesson.
        </p>
      </div>
    </div>
  );
}
