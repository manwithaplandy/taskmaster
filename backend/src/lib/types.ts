import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  submission_type: "image" | "text";
  max_points: number;
}

export interface TaskEvaluation {
  points: number;
  feedback: string;
}
