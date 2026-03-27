"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in-up">
      <div className="bg-surface border border-primary/20 rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
          {mode === "login" ? "Welcome Back" : "Join Taskmaster"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-text-muted mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface-light border border-primary/30 rounded-xl text-text focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/20 focus:shadow-[var(--shadow-glow-purple)] transition-all duration-200"
                placeholder="TaskmasterFan42"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface-light border border-primary/30 rounded-xl text-text focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/20 focus:shadow-[var(--shadow-glow-purple)] transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-surface-light border border-primary/30 rounded-xl text-text focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary/20 focus:shadow-[var(--shadow-glow-purple)] transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-hard text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary-light disabled:opacity-50 disabled:shadow-none text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            {loading
              ? "Loading..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-4">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary-light hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-primary-light hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
