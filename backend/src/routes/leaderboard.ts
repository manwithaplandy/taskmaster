import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .limit(100);

  if (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
    return;
  }

  res.json({ leaderboard: data || [] });
});

export default router;
