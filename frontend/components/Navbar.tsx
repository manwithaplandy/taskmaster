"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-primary/20">
      <div className="max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-accent">
          Taskmaster
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link
                href="/history"
                className="text-sm text-text-muted hover:text-text transition-colors"
              >
                History
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-text-muted hover:text-text transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-primary hover:bg-primary-light text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
