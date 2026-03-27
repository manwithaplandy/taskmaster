import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SubmissionForm from "./SubmissionForm";
import type { Task } from "@/lib/types";

vi.mock("@/lib/supabase-browser", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.com/image.jpg" },
        })),
      })),
    },
  },
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  user_id: "user-1",
  title: "Test Task",
  description: "Test description",
  difficulty: "medium",
  submission_type: "text",
  max_points: 20,
  status: "active",
  points_awarded: 0,
  evaluation_feedback: null,
  submission_text: null,
  submission_image_url: null,
  created_at: "2025-01-01T00:00:00Z",
  completed_at: null,
  ...overrides,
});

describe("SubmissionForm", () => {
  describe("text submission", () => {
    it("shows textarea for text submission type", () => {
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText("Your response")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Write your response here...")
      ).toBeInTheDocument();
    });

    it("submit button is disabled when textarea is empty", () => {
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });

    it("submit button is enabled when textarea has text", async () => {
      const user = userEvent.setup();
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "My response"
      );

      expect(
        screen.getByRole("button", { name: "Submit" })
      ).not.toBeDisabled();
    });

    it("submit button remains disabled with whitespace-only text", async () => {
      const user = userEvent.setup();
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "   "
      );

      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });

    it("calls onSubmit with text when form is submitted", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={onSubmit}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "My text answer"
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ text: "My text answer" });
      });
    });

    it("shows 'Submitting...' during submission", async () => {
      const user = userEvent.setup();
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          })
      );

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={onSubmit}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "Answer"
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(screen.getByText("Submitting...")).toBeInTheDocument();

      resolveSubmit();
      await waitFor(() => {
        expect(screen.getByText("Submit")).toBeInTheDocument();
      });
    });
  });

  describe("image submission", () => {
    it("shows file upload area for image submission type", () => {
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(
        screen.getByText("Upload your photo proof")
      ).toBeInTheDocument();
      expect(screen.getByText("Tap to upload photo")).toBeInTheDocument();
    });

    it("submit button is disabled when no file is selected", () => {
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });

    it("rejects files larger than 10MB", async () => {
      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      // Create a file larger than 10MB
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        "big.jpg",
        { type: "image/jpeg" }
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      // Use fireEvent.change for more control over the file input
      fireEvent.change(input, { target: { files: [largeFile] } });

      expect(
        screen.getByText("Image must be under 10MB.")
      ).toBeInTheDocument();
      // Submit should still be disabled
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });

    it("shows image preview after valid file selection", async () => {
      // Spy on FileReader.prototype.readAsDataURL to trigger onloadend
      const readAsDataURLSpy = vi
        .spyOn(FileReader.prototype, "readAsDataURL")
        .mockImplementation(function (this: FileReader) {
          Object.defineProperty(this, "result", {
            value: "data:image/jpeg;base64,abc123",
            writable: false,
            configurable: true,
          });
          if (this.onloadend) {
            this.onloadend(new ProgressEvent("loadend"));
          }
        });

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      const validFile = new File(["image data"], "photo.jpg", {
        type: "image/jpeg",
      });

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        const preview = screen.getByAltText("Preview");
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute(
          "src",
          "data:image/jpeg;base64,abc123"
        );
      });

      readAsDataURLSpy.mockRestore();
    });

    it("enables submit button after valid file selection", async () => {
      const readAsDataURLSpy = vi
        .spyOn(FileReader.prototype, "readAsDataURL")
        .mockImplementation(function (this: FileReader) {
          Object.defineProperty(this, "result", {
            value: "data:image/jpeg;base64,abc",
            writable: false,
            configurable: true,
          });
          if (this.onloadend) {
            this.onloadend(new ProgressEvent("loadend"));
          }
        });

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      const validFile = new File(["data"], "photo.jpg", {
        type: "image/jpeg",
      });
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Submit" })
        ).not.toBeDisabled();
      });

      readAsDataURLSpy.mockRestore();
    });

    it("clears error when a valid file is selected after an invalid one", async () => {
      const readAsDataURLSpy = vi
        .spyOn(FileReader.prototype, "readAsDataURL")
        .mockImplementation(function (this: FileReader) {
          Object.defineProperty(this, "result", {
            value: "data:image/jpeg;base64,abc",
            writable: false,
            configurable: true,
          });
          if (this.onloadend) {
            this.onloadend(new ProgressEvent("loadend"));
          }
        });

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "image" })}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      // First, upload a file that's too large
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        "big.jpg",
        { type: "image/jpeg" }
      );
      fireEvent.change(input, { target: { files: [largeFile] } });
      expect(screen.getByText("Image must be under 10MB.")).toBeInTheDocument();

      // Then upload a valid file
      const validFile = new File(["ok"], "small.jpg", {
        type: "image/jpeg",
      });
      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(
          screen.queryByText("Image must be under 10MB.")
        ).not.toBeInTheDocument();
      });

      readAsDataURLSpy.mockRestore();
    });
  });

  describe("skip flow", () => {
    it("shows Skip button initially", () => {
      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: "Skip" })
      ).toBeInTheDocument();
    });

    it("clicking Skip shows penalty confirm with correct penalty", async () => {
      const user = userEvent.setup();
      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={2}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));

      // Skip penalty = consecutiveSkips + 1 = 3
      expect(screen.getByText(/\u22123 pts/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("cancel button hides the skip confirm", async () => {
      const user = userEvent.setup();
      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.queryByRole("button", { name: "Cancel" })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Skip" })
      ).toBeInTheDocument();
    });

    it("confirming skip calls onSkip", async () => {
      const user = userEvent.setup();
      const onSkip = vi.fn().mockResolvedValue(undefined);

      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={onSkip}
        />
      );

      // First click shows confirm
      await user.click(screen.getByRole("button", { name: "Skip" }));
      // Second click on penalty button confirms
      await user.click(screen.getByText(/\u22121 pts/));

      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledTimes(1);
      });
    });

    it("shows penalty of consecutiveSkips + 1 in confirm state", async () => {
      const user = userEvent.setup();

      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={4}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));
      // Penalty should be 4 + 1 = 5
      expect(screen.getByText(/\u22125 pts/)).toBeInTheDocument();
    });

    it("shows penalty of 1 when consecutiveSkips is 0", async () => {
      const user = userEvent.setup();

      render(
        <SubmissionForm
          task={makeTask()}
          consecutiveSkips={0}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Skip" }));
      expect(screen.getByText(/\u22121 pts/)).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("displays error message on submission failure", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error("Server error"));

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={onSubmit}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "Some answer"
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("displays generic error for non-Error rejections", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue("string error");

      render(
        <SubmissionForm
          task={makeTask({ submission_type: "text" })}
          consecutiveSkips={0}
          onSubmit={onSubmit}
          onSkip={vi.fn()}
        />
      );

      await user.type(
        screen.getByPlaceholderText("Write your response here..."),
        "Some answer"
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to submit. Please try again.")
        ).toBeInTheDocument();
      });
    });
  });
});
