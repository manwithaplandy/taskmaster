import express from "express";
import cors from "cors";
import taskRoutes from "./routes/tasks";
import leaderboardRoutes from "./routes/leaderboard";
import { requireAuth } from "./middleware/auth";
import { supabase } from "./lib/supabase";
import { AuthenticatedRequest } from "./lib/types";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/tasks", taskRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Profile endpoint
app.get(
  "/api/profile",
  requireAuth,
  async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.userId!)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json({ profile });
  }
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Taskmaster backend running on port ${PORT}`);
});
