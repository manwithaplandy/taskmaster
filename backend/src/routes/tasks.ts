import { Router, Response } from "express";
import { supabase } from "../lib/supabase";
import { AuthenticatedRequest } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { generateTask, evaluateSubmission } from "../services/claude";

const router = Router();

// Generate a new task
router.post(
  "/generate",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check for existing active task
      const { data: existing } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", req.userId!)
        .eq("status", "active")
        .single();

      if (existing) {
        res.json({ task: existing });
        return;
      }

      const generated = await generateTask();

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          user_id: req.userId!,
          title: generated.title,
          description: generated.description,
          difficulty: generated.difficulty,
          submission_type: generated.submission_type,
          max_points: generated.max_points,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: "Failed to save task" });
        return;
      }

      res.json({ task });
    } catch (err) {
      console.error("Task generation error:", err);
      res.status(500).json({ error: "Failed to generate task" });
    }
  }
);

// Get active task
router.get(
  "/active",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", req.userId!)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    res.json({ task: task || null });
  }
);

// Submit task completion
router.post(
  "/:id/submit",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { text, image_url } = req.body;

      // Get the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", req.userId!)
        .eq("status", "active")
        .single();

      if (taskError || !task) {
        res.status(404).json({ error: "Active task not found" });
        return;
      }

      if (task.submission_type === "image" ? !image_url : !text) {
        res.status(400).json({ error: "Submission content required" });
        return;
      }

      // Evaluate with Claude
      const evaluation = await evaluateSubmission(
        task.title,
        task.description,
        task.difficulty,
        task.max_points,
        task.submission_type,
        text || undefined,
        image_url || undefined
      );

      // Atomically update task and profile in one transaction
      await supabase.rpc("complete_task", {
        p_task_id: id,
        p_user_id: req.userId!,
        p_points: evaluation.points,
        p_feedback: evaluation.feedback,
        p_submission_text: text || null,
        p_submission_image_url: image_url || null,
      });

      // Fetch the updated task to return to the client
      const { data: updatedTask } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      res.json({
        points: evaluation.points,
        feedback: evaluation.feedback,
        task: updatedTask,
      });
    } catch (err) {
      console.error("Submission error:", err);
      res.status(500).json({ error: "Failed to evaluate submission" });
    }
  }
);

// Skip task
router.post(
  "/:id/skip",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Get the task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", req.userId!)
        .eq("status", "active")
        .single();

      if (taskError || !task) {
        res.status(404).json({ error: "Active task not found" });
        return;
      }

      // Get current consecutive skips
      const { data: profile } = await supabase
        .from("profiles")
        .select("consecutive_skips")
        .eq("id", req.userId!)
        .single();

      const currentSkips = profile?.consecutive_skips || 0;
      const penalty = -(currentSkips + 1);

      // Atomically update task and profile in one transaction
      await supabase.rpc("skip_task", {
        p_task_id: id,
        p_user_id: req.userId!,
        p_penalty: penalty,
      });

      // Fetch the updated task to return to the client
      const { data: updatedTask } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      res.json({
        penalty,
        consecutive_skips: currentSkips + 1,
        task: updatedTask,
      });
    } catch (err) {
      console.error("Skip error:", err);
      res.status(500).json({ error: "Failed to skip task" });
    }
  }
);

// Task history
router.get(
  "/history",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", req.userId!)
      .neq("status", "active")
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    res.json({ tasks: tasks || [], page, limit });
  }
);

export default router;
