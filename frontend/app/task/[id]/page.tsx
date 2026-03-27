"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { submitTask, skipTask, getActiveTask } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const active = await getActiveTask();
      if (active && active.id === id) {
        setTask(active);
      } else if (active) {
        router.push(`/task/${active.id}`);
        return;
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
    const evaluation = await submitTask(task.id, submission);
    setResult({ points: evaluation.points, feedback: evaluation.feedback });
    setTask(evaluation.task);
  };

  const handleSkip = async () => {
    if (!task) return;
    const skipResult = await skipTask(task.id);
    setSkipPenalty(skipResult.penalty);
    setTask(skipResult.task);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 space-y-4">
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
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2">
          <p className="text-3xl font-extrabold text-accent">
            +{result.points} points!
          </p>
          <p className="text-text-muted">The Taskmaster has spoken.</p>
        </div>
        <TaskCard task={task} showFeedback />
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl transition-colors"
        >
          Next Task
        </button>
      </div>
    );
  }

  // Show skip result
  if (skipPenalty !== null) {
    return (
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2">
          <p className="text-3xl font-extrabold text-hard">
            {skipPenalty} points
          </p>
          <p className="text-text-muted">
            The Taskmaster is disappointed. Consecutive skips cost more!
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl transition-colors"
        >
          Try Another Task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <TaskCard task={task} />
      <SubmissionForm task={task} onSubmit={handleSubmit} onSkip={handleSkip} />
    </div>
  );
}
