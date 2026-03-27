"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { Task } from "@/lib/types";

interface SubmissionFormProps {
  task: Task;
  onSubmit: (submission: { text?: string; image_url?: string }) => Promise<void>;
  onSkip: () => Promise<void>;
}

export default function SubmissionForm({
  task,
  onSubmit,
  onSkip,
}: SubmissionFormProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (task.submission_type === "image" && imageFile) {
        // Upload to Supabase Storage
        const fileName = `${task.user_id}/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("task-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("task-images").getPublicUrl(fileName);

        await onSubmit({ image_url: publicUrl });
      } else {
        await onSubmit({ text });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await onSkip();
    } finally {
      setSkipping(false);
    }
  };

  const isValid =
    task.submission_type === "image" ? !!imageFile : text.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {task.submission_type === "image" ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-text-muted">
            Upload your photo proof
          </label>
          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="text-text-muted">
                  <p className="text-lg mb-1">Tap to upload photo</p>
                  <p className="text-xs">JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-muted">
            Your response
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your response here..."
            rows={4}
            className="w-full px-3 py-2 bg-surface-light border border-primary/30 rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary resize-none"
          />
        </div>
      )}

      {error && (
        <p className="text-hard text-sm text-center">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="px-4 py-3 bg-surface-light border border-hard/30 text-hard hover:bg-hard/10 disabled:opacity-50 font-semibold rounded-xl transition-colors"
        >
          {skipping ? "..." : "Skip"}
        </button>
      </div>
    </form>
  );
}
