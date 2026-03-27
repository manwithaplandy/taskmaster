import { Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { AuthenticatedRequest } from "../lib/types";

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.userId = user.id;
  req.userEmail = user.email;
  next();
}
