"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { getTaskHistory } from "@/lib/api";
import TaskCard from "@/components/TaskCard";
import type { Task } from "@/lib/types";

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
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

      const history = await getTaskHistory();
      setTasks(history);
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-center">Task History</h1>
      {tasks.length === 0 ? (
        <p className="text-center text-text-muted py-8">
          No completed tasks yet. Go generate one!
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showFeedback />
          ))}
        </div>
      )}
    </div>
  );
}
