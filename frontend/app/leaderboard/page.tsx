"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { getLeaderboard } from "@/lib/api";
import LeaderboardTable from "@/components/LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [leaderboard, { data }] = await Promise.all([
        getLeaderboard(),
        supabase.auth.getUser(),
      ]);
      setEntries(leaderboard);
      setUserId(data.user?.id);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-center">Leaderboard</h1>
      <LeaderboardTable entries={entries} currentUserId={userId} />
    </div>
  );
}
