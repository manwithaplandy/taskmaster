"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { generateTask, getActiveTask, getProfile } from "@/lib/api";
import GenerateTaskButton from "@/components/GenerateTaskButton";
import TaskCard from "@/components/TaskCard";
import type { Task, Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const [task, prof] = await Promise.all([
          getActiveTask(),
          getProfile(),
        ]);
        setActiveTask(task);
        setProfile(prof);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleGenerate = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setError("");
    try {
      const task = await generateTask();
      setActiveTask(task);
      router.push(`/task/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate task");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 pt-8">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
          Taskmaster
        </h1>
        <p className="text-text-muted text-lg">
          Silly tasks. Serious competition.
        </p>
        {profile && (
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-accent font-semibold">
              {profile.total_points} pts
            </span>
            <span className="text-text-muted">
              {profile.tasks_completed} tasks
            </span>
          </div>
        )}
      </div>

      {/* Active task or generate button */}
      {activeTask ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-text-muted">
            You have an active task:
          </p>
          <TaskCard task={activeTask} />
          <button
            onClick={() => router.push(`/task/${activeTask.id}`)}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl transition-colors"
          >
            Continue Task
          </button>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          <p className="text-center text-text-muted">
            Ready for a challenge? The Taskmaster awaits.
          </p>
          <GenerateTaskButton onGenerate={handleGenerate} />
          {!user && (
            <p className="text-center text-xs text-text-muted">
              Sign in to start earning points
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-center text-hard text-sm">{error}</p>
      )}
    </div>
  );
}
