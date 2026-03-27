export interface Profile {
  id: string;
  username: string;
  total_points: number;
  tasks_completed: number;
  consecutive_skips: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  submission_type: "image" | "text";
  max_points: number;
  status: "active" | "completed" | "skipped";
  points_awarded: number;
  evaluation_feedback: string | null;
  submission_text: string | null;
  submission_image_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  tasks_completed: number;
  rank: number;
}

export interface TaskGenerationResult {
  task: Task;
}

export interface TaskEvaluationResult {
  points: number;
  feedback: string;
  task: Task;
}

export interface SkipResult {
  penalty: number;
  consecutive_skips: number;
  task: Task;
}
