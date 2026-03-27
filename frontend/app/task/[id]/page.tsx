"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { submitTask, skipTask, getActiveTask, getProfile } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import SubmissionForm from "@/components/SubmissionForm";
import type { Task } from "@/lib/types";

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [result, setResult] = useState<{
    points: number;
    feedback: string;
  } | null>(null);
  const [skipPenalty, setSkipPenalty] = useState<number | null>(null);
  const [consecutiveSkips, setConsecutiveSkips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const [active, profile] = await Promise.all([
          getActiveTask(),
          getProfile(),
        ]);
        if (profile) setConsecutiveSkips(profile.consecutive_skips);
        if (active && active.id === id) {
          setTask(active);
        } else if (active) {
          router.push(`/task/${active.id}`);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      }
      setLoading(false);
    };
    load();
  }, [id, router]);

  const handleSubmit = async (submission: {
    text?: string;
    image_url?: string;
  }) => {
    if (!task) return;
    setError("");
    const evaluation = await submitTask(task.id, submission);
    setResult({ points: evaluation.points, feedback: evaluation.feedback });
    setTask(evaluation.task);
  };

  const handleSkip = async () => {
    if (!task) return;
    setError("");
    try {
      const skipResult = await skipTask(task.id);
      setSkipPenalty(skipResult.penalty);
      setTask(skipResult.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip task");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 space-y-4 animate-fade-in-up">
        <p className="text-text-muted">Task not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-primary-light hover:underline"
        >
          Go home
        </button>
      </div>
    );
  }

  // Show result after completion
  if (result) {
    return (
      <div className="space-y-6 pt-4 animate-fade-in-up">
        <div className="text-center space-y-3">
          <p className="text-4xl sm:text-5xl font-extrabold text-accent animate-scale-bounce animate-pulse-glow">
            +{result.points} points!
          </p>
          <div className="w-16 h-1 bg-accent rounded-full mx-auto" />
          <p className="text-text-muted text-lg">The Taskmaster has spoken.</p>
        </div>
        <TaskCard task={task} showFeedback />
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          Next Task
        </button>
      </div>
    );
  }

  // Show skip result
  if (skipPenalty !== null) {
    return (
      <div className="space-y-6 pt-4 animate-fade-in-up">
        <div className="text-center space-y-3">
          <p className="text-4xl sm:text-5xl font-extrabold text-hard animate-scale-bounce drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            {skipPenalty} points
          </p>
          <div className="w-16 h-1 bg-hard rounded-full mx-auto" />
          <p className="text-text-muted text-lg italic">
            The Taskmaster is disappointed. Consecutive skips cost more!
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          Try Another Task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 animate-fade-in-up">
      <TaskCard task={task} />
      {error && (
        <p className="text-hard text-sm text-center">{error}</p>
      )}
      <SubmissionForm task={task} consecutiveSkips={consecutiveSkips} onSubmit={handleSubmit} onSkip={handleSkip} />
    </div>
  );
}
