import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-text-muted py-8">
        No one on the leaderboard yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrentUser = entry.id === currentUserId;
        const rankDisplay =
          entry.rank === 1
            ? "1st"
            : entry.rank === 2
            ? "2nd"
            : entry.rank === 3
            ? "3rd"
            : `${entry.rank}th`;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isCurrentUser
                ? "bg-primary/15 border border-primary/30"
                : "bg-surface border border-primary/10"
            }`}
          >
            <span
              className={`w-10 text-center font-bold text-sm ${
                entry.rank <= 3 ? "text-accent" : "text-text-muted"
              }`}
            >
              {rankDisplay}
            </span>
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
            <span className="font-bold text-accent">
              {entry.total_points} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}
