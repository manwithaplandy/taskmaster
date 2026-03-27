import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GenerateTaskButton from "./GenerateTaskButton";

describe("GenerateTaskButton", () => {
  it("renders 'Generate Task' text", () => {
    render(<GenerateTaskButton onGenerate={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Generate Task" })
    ).toBeInTheDocument();
  });

  it("shows loading spinner and 'Generating...' during generation", async () => {
    const user = userEvent.setup();
    let resolveGenerate!: () => void;
    const onGenerate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve;
        })
    );

    render(<GenerateTaskButton onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: "Generate Task" }));

    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    resolveGenerate();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Generate Task" })
      ).toBeInTheDocument();
    });
  });

  it("disables button when loading", async () => {
    const user = userEvent.setup();
    let resolveGenerate!: () => void;
    const onGenerate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve;
        })
    );

    render(<GenerateTaskButton onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: "Generate Task" }));

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    resolveGenerate();
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  it("disables button when disabled prop is true", () => {
    render(<GenerateTaskButton onGenerate={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onGenerate when clicked", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(undefined);

    render(<GenerateTaskButton onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: "Generate Task" }));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("re-enables after generation completes successfully", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(undefined);

    render(<GenerateTaskButton onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: "Generate Task" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Generate Task" })
      ).not.toBeDisabled();
    });
  });

  it("re-enables after generation fails", async () => {
    const user = userEvent.setup();

    const rejectionHandler = () => {};
    process.on("unhandledRejection", rejectionHandler);

    try {
      let rejectGenerate!: (err: Error) => void;
      const onGenerate = vi.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectGenerate = reject;
          })
      );

      render(<GenerateTaskButton onGenerate={onGenerate} />);
      await user.click(screen.getByRole("button", { name: "Generate Task" }));

      expect(screen.getByRole("button")).toBeDisabled();

      rejectGenerate(new Error("API error"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Generate Task" })
        ).not.toBeDisabled();
      });
    } finally {
      process.removeListener("unhandledRejection", rejectionHandler);
    }
  });

  it("does not call onGenerate when button is disabled", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(undefined);

    render(<GenerateTaskButton onGenerate={onGenerate} disabled={true} />);
    await user.click(screen.getByRole("button"));

    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("does not show glow animation while loading", async () => {
    const user = userEvent.setup();
    let resolveGenerate!: () => void;
    const onGenerate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve;
        })
    );

    const { container } = render(
      <GenerateTaskButton onGenerate={onGenerate} />
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate Task" }));

    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();

    resolveGenerate();
    await waitFor(() => {
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });
});
