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
    <button
      onClick={handleClick}
      disabled={loading || disabled}
      className="relative w-full max-w-xs mx-auto block py-4 px-8 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary disabled:opacity-50 text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95"
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
  );
}
