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

  const loadUserData = async () => {
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      try {
        const [task, prof] = await Promise.all([
          getActiveTask(),
          getProfile(),
        ]);
        setActiveTask(task);
        setProfile(prof);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserData();
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
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative text-center space-y-4 pt-8 animate-fade-in-up">
        <div className="absolute inset-0 -top-8 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.06)_0%,transparent_70%)] pointer-events-none" />
        <h1 className="relative text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
          Taskmaster
        </h1>
        <p
          className="relative text-lg sm:text-xl text-text-muted"
          style={{ animationDelay: "0.1s" }}
        >
          Silly tasks. Serious competition.
        </p>
        {profile && (
          <div
            className="flex justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="bg-surface border border-accent/20 rounded-xl px-4 py-2 shadow-[var(--shadow-card)]">
              <span className="text-lg font-bold text-accent">
                {profile.total_points}
              </span>
              <span className="text-xs text-text-muted ml-1">pts</span>
            </div>
            <div className="bg-surface border border-primary/20 rounded-xl px-4 py-2 shadow-[var(--shadow-card)]">
              <span className="text-lg font-bold text-text">
                {profile.tasks_completed}
              </span>
              <span className="text-xs text-text-muted ml-1">tasks</span>
            </div>
          </div>
        )}
      </div>

      {/* Active task or generate button */}
      {activeTask ? (
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <p className="text-center text-sm text-text-muted">
            You have an active task:
          </p>
          <TaskCard task={activeTask} />
          <button
            onClick={() => router.push(`/task/${activeTask.id}`)}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
          >
            Continue Task
          </button>
        </div>
      ) : (
        <div className="space-y-4 pt-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <p className="text-center text-lg text-text-muted">
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
        <div className="text-center space-y-2 animate-fade-in-up">
          <p className="text-hard text-sm">{error}</p>
          <button
            onClick={() => { setError(""); handleGenerate(); }}
            className="text-primary-light hover:underline text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
