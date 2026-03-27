interface PointsBadgeProps {
  difficulty: "easy" | "medium" | "hard";
  points?: number;
  maxPoints: number;
}

const difficultyConfig = {
  easy: { label: "Easy", color: "bg-easy/20 text-easy border-easy/30" },
  medium: {
    label: "Medium",
    color: "bg-medium/20 text-medium border-medium/30",
  },
  hard: { label: "Hard", color: "bg-hard/20 text-hard border-hard/30" },
};

export default function PointsBadge({
  difficulty,
  points,
  maxPoints,
}: PointsBadgeProps) {
  const config = difficultyConfig[difficulty];
  const isPerfect = points !== undefined && points === maxPoints;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full border shadow-sm ${config.color}`}
      >
        {config.label}
      </span>
      <span className={`text-sm text-text-muted ${isPerfect ? "animate-pulse-glow text-accent font-bold" : ""}`}>
        {points !== undefined ? `${points}/${maxPoints}` : `${maxPoints}`} pts
      </span>
    </div>
  );
}
