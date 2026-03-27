"use client";

import { useState } from "react";

interface GenerateTaskButtonProps {
  onGenerate: () => Promise<void>;
  disabled?: boolean;
}

export default function GenerateTaskButton({
  onGenerate,
  disabled,
}: GenerateTaskButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      {!loading && (
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse blur-xl -z-10" />
      )}
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={`relative w-full block py-4 px-8 bg-gradient-to-r from-primary via-primary-light to-accent/80 hover:from-primary-light hover:via-primary hover:to-accent/60 disabled:opacity-50 text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 ${loading ? "cursor-wait" : ""}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generating...
          </span>
        ) : (
          "Generate Task"
        )}
      </button>
    </div>
  );
}
