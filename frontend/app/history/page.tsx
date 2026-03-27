"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { getTaskHistory } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import type { Task } from "@/lib/types";

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const history = await getTaskHistory(1, PAGE_SIZE);
      setTasks(history);
      setHasMore(history.length === PAGE_SIZE);
      setLoading(false);
    };
    load();
  }, [router]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const moreTasks = await getTaskHistory(nextPage, PAGE_SIZE);
    setTasks((prev) => [...prev, ...moreTasks]);
    setPage(nextPage);
    setHasMore(moreTasks.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent animate-fade-in-up">
        Task History
      </h1>
      {tasks.length === 0 ? (
        <div className="text-center py-12 space-y-2 animate-fade-in-up">
          <p className="text-xl font-bold text-text">Your quest log is empty</p>
          <p className="text-text-muted">Go generate a task and start earning points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <TaskCard task={task} showFeedback />
            </div>
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 bg-surface-light border border-primary/20 text-text-muted hover:text-text hover:-translate-y-0.5 disabled:opacity-50 font-semibold rounded-xl transition-all duration-200"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
