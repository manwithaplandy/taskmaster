import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const medalStyles: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: {
    bg: "bg-accent/10",
    text: "text-gold",
    border: "border-accent/30 border-l-4 border-l-accent",
    badge: "bg-gradient-to-b from-yellow-400 to-amber-600 text-black shadow-[var(--shadow-glow-amber)]",
  },
  2: {
    bg: "bg-surface",
    text: "text-silver",
    border: "border-silver/30 border-l-4 border-l-silver",
    badge: "bg-gradient-to-b from-gray-300 to-gray-500 text-black",
  },
  3: {
    bg: "bg-surface",
    text: "text-bronze",
    border: "border-bronze/30 border-l-4 border-l-bronze",
    badge: "bg-gradient-to-b from-amber-600 to-amber-800 text-white",
  },
};

function getRankDisplay(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export default function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 animate-fade-in-up">
        <p className="text-xl font-bold text-text">The stage is empty</p>
        <p className="text-text-muted">Be the first to claim the throne.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const isCurrentUser = entry.id === currentUserId;
        const medal = medalStyles[entry.rank];
        const isTop3 = entry.rank <= 3;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-surface-light animate-fade-in-up ${
              medal
                ? `${medal.bg} border ${medal.border}`
                : isCurrentUser
                ? "bg-primary/15 border border-primary/30"
                : "bg-surface border border-primary/10"
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {medal ? (
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${medal.badge}`}
              >
                {entry.rank}
              </span>
            ) : (
              <span className="w-8 text-center font-bold text-sm text-text-muted shrink-0">
                {getRankDisplay(entry.rank)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {entry.username}
                {isCurrentUser && (
                  <span className="text-primary-light ml-1">(you)</span>
                )}
              </p>
              <p className="text-xs text-text-muted">
                {entry.tasks_completed} tasks
              </p>
            </div>
            <span className={`font-bold ${isTop3 ? "text-lg" : ""} text-accent`}>
              {entry.total_points} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}
