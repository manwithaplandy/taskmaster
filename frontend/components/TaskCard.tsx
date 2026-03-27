import type { Task } from "@/lib/types";
import PointsBadge from "./PointsBadge";

interface TaskCardProps {
  task: Task;
  showFeedback?: boolean;
}

export default function TaskCard({ task, showFeedback }: TaskCardProps) {
  return (
    <div className="bg-surface border border-primary/20 rounded-2xl p-5 space-y-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold leading-tight">{task.title}</h2>
        <PointsBadge
          difficulty={task.difficulty}
          points={task.status === "completed" ? task.points_awarded : undefined}
          maxPoints={task.max_points}
        />
      </div>

      <p className="text-text-muted text-sm leading-relaxed">
        {task.description}
      </p>

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="bg-surface-light px-2 py-1 rounded">
          {task.submission_type === "image" ? "Photo proof" : "Text response"}{" "}
          required
        </span>
      </div>

      {showFeedback && task.evaluation_feedback && (
        <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20 rounded-xl shadow-inner">
          <p className="text-xs font-semibold text-accent mb-1 uppercase tracking-wide">
            Taskmaster says:
          </p>
          <p className="text-sm text-text-muted italic">
            {task.evaluation_feedback}
          </p>
        </div>
      )}

      {task.status === "skipped" && (
        <div className="mt-3 p-3 bg-hard/10 border border-hard/20 rounded-xl shadow-inner">
          <p className="text-sm text-hard">
            Skipped ({task.points_awarded} points)
          </p>
        </div>
      )}
    </div>
  );
}
