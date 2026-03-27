import { render, screen } from "@testing-library/react";
import TaskCard from "./TaskCard";
import type { Task } from "@/lib/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  user_id: "user-1",
  title: "Take a photo of a sunset",
  description: "Capture a beautiful sunset from your location.",
  difficulty: "medium",
  submission_type: "image",
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

describe("TaskCard", () => {
  it("renders the task title", () => {
    render(<TaskCard task={makeTask()} />);
    expect(
      screen.getByText("Take a photo of a sunset")
    ).toBeInTheDocument();
  });

  it("renders the task description", () => {
    render(<TaskCard task={makeTask()} />);
    expect(
      screen.getByText("Capture a beautiful sunset from your location.")
    ).toBeInTheDocument();
  });

  it("renders the difficulty badge via PointsBadge", () => {
    render(<TaskCard task={makeTask({ difficulty: "hard", max_points: 30 })} />);
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("30 pts")).toBeInTheDocument();
  });

  it("shows 'Photo proof required' for image submission type", () => {
    render(<TaskCard task={makeTask({ submission_type: "image" })} />);
    expect(screen.getByText(/Photo proof/)).toBeInTheDocument();
  });

  it("shows 'Text response required' for text submission type", () => {
    render(<TaskCard task={makeTask({ submission_type: "text" })} />);
    expect(screen.getByText(/Text response/)).toBeInTheDocument();
  });

  it("shows feedback when showFeedback=true and evaluation_feedback exists", () => {
    const task = makeTask({
      status: "completed",
      evaluation_feedback: "Great job! You captured a wonderful sunset.",
    });
    render(<TaskCard task={task} showFeedback={true} />);

    expect(screen.getByText("Taskmaster says:")).toBeInTheDocument();
    expect(
      screen.getByText("Great job! You captured a wonderful sunset.")
    ).toBeInTheDocument();
  });

  it("does not show feedback when showFeedback=false", () => {
    const task = makeTask({
      status: "completed",
      evaluation_feedback: "Great job!",
    });
    render(<TaskCard task={task} showFeedback={false} />);

    expect(screen.queryByText("Taskmaster says:")).not.toBeInTheDocument();
    expect(screen.queryByText("Great job!")).not.toBeInTheDocument();
  });

  it("does not show feedback when showFeedback=true but evaluation_feedback is null", () => {
    const task = makeTask({
      status: "completed",
      evaluation_feedback: null,
    });
    render(<TaskCard task={task} showFeedback={true} />);

    expect(screen.queryByText("Taskmaster says:")).not.toBeInTheDocument();
  });

  it("does not show feedback when showFeedback is not provided", () => {
    const task = makeTask({
      evaluation_feedback: "Some feedback",
    });
    render(<TaskCard task={task} />);

    expect(screen.queryByText("Taskmaster says:")).not.toBeInTheDocument();
  });

  it("shows skip penalty info when status is 'skipped'", () => {
    const task = makeTask({
      status: "skipped",
      points_awarded: -2,
    });
    render(<TaskCard task={task} />);

    expect(screen.getByText("Skipped (-2 points)")).toBeInTheDocument();
  });

  it("does not show skip info when status is not 'skipped'", () => {
    const task = makeTask({ status: "active" });
    render(<TaskCard task={task} />);

    expect(screen.queryByText(/Skipped/)).not.toBeInTheDocument();
  });

  it("shows points for completed tasks via PointsBadge", () => {
    const task = makeTask({
      status: "completed",
      points_awarded: 15,
      max_points: 20,
    });
    render(<TaskCard task={task} />);

    expect(screen.getByText("15/20 pts")).toBeInTheDocument();
  });

  it("does not show points awarded for active tasks", () => {
    const task = makeTask({
      status: "active",
      points_awarded: 0,
      max_points: 20,
    });
    render(<TaskCard task={task} />);

    expect(screen.getByText("20 pts")).toBeInTheDocument();
    expect(screen.queryByText("0/20 pts")).not.toBeInTheDocument();
  });
});
