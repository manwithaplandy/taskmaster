import { supabase } from "./supabase-browser";
import type {
  Task,
  TaskEvaluationResult,
  SkipResult,
  LeaderboardEntry,
  Profile,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

export async function generateTask(): Promise<Task> {
  const data = await apiFetch<{ task: Task }>("/api/tasks/generate", {
    method: "POST",
  });
  return data.task;
}

export async function getActiveTask(): Promise<Task | null> {
  const data = await apiFetch<{ task: Task | null }>("/api/tasks/active");
  return data.task;
}

export async function submitTask(
  taskId: string,
  submission: { text?: string; image_url?: string }
): Promise<TaskEvaluationResult> {
  return apiFetch<TaskEvaluationResult>(`/api/tasks/${taskId}/submit`, {
    method: "POST",
    body: JSON.stringify(submission),
  });
}

export async function skipTask(taskId: string): Promise<SkipResult> {
  return apiFetch<SkipResult>(`/api/tasks/${taskId}/skip`, {
    method: "POST",
  });
}

export async function getTaskHistory(): Promise<Task[]> {
  const data = await apiFetch<{ tasks: Task[] }>("/api/tasks/history");
  return data.tasks;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>(
    "/api/leaderboard"
  );
  return data.leaderboard;
}

export async function getProfile(): Promise<Profile | null> {
  const data = await apiFetch<{ profile: Profile }>("/api/profile");
  return data.profile;
}
