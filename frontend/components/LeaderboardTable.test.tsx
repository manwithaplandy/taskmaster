import { render, screen } from "@testing-library/react";
import LeaderboardTable from "./LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/types";

const makeEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  id: "user-1",
  username: "alice",
  total_points: 100,
  tasks_completed: 5,
  rank: 1,
  ...overrides,
});

describe("LeaderboardTable", () => {
  it("shows empty state message when no entries", () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByText("The stage is empty")).toBeInTheDocument();
    expect(
      screen.getByText("Be the first to claim the throne.")
    ).toBeInTheDocument();
  });

  it("renders all entries with correct username and points", () => {
    const entries = [
      makeEntry({ id: "u1", username: "alice", total_points: 100, rank: 1 }),
      makeEntry({ id: "u2", username: "bob", total_points: 80, rank: 2 }),
      makeEntry({ id: "u3", username: "charlie", total_points: 60, rank: 3 }),
    ];
    render(<LeaderboardTable entries={entries} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("charlie")).toBeInTheDocument();
    expect(screen.getByText("100 pts")).toBeInTheDocument();
    expect(screen.getByText("80 pts")).toBeInTheDocument();
    expect(screen.getByText("60 pts")).toBeInTheDocument();
  });

  it("renders tasks completed count for each entry", () => {
    const entries = [
      makeEntry({ id: "u1", tasks_completed: 12, rank: 1 }),
    ];
    render(<LeaderboardTable entries={entries} />);
    expect(screen.getByText("12 tasks")).toBeInTheDocument();
  });

  it("shows medal badge (rank number) for top 3 ranks", () => {
    const entries = [
      makeEntry({ id: "u1", rank: 1, username: "first" }),
      makeEntry({ id: "u2", rank: 2, username: "second" }),
      makeEntry({ id: "u3", rank: 3, username: "third" }),
    ];
    render(<LeaderboardTable entries={entries} />);

    const badges = screen.getAllByText(/^[123]$/);
    expect(badges).toHaveLength(3);
  });

  it("shows rank display format for ranks beyond 3rd", () => {
    const entries = [
      makeEntry({ id: "u4", rank: 4, username: "fourth" }),
      makeEntry({ id: "u5", rank: 5, username: "fifth" }),
      makeEntry({ id: "u11", rank: 11, username: "eleventh" }),
    ];
    render(<LeaderboardTable entries={entries} />);

    expect(screen.getByText("4th")).toBeInTheDocument();
    expect(screen.getByText("5th")).toBeInTheDocument();
    expect(screen.getByText("11th")).toBeInTheDocument();
  });

  it("highlights current user with '(you)' indicator", () => {
    const entries = [
      makeEntry({ id: "u1", rank: 1, username: "alice" }),
      makeEntry({ id: "current-user", rank: 2, username: "me" }),
    ];
    render(
      <LeaderboardTable entries={entries} currentUserId="current-user" />
    );

    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("does not show '(you)' when currentUserId does not match any entry", () => {
    const entries = [
      makeEntry({ id: "u1", rank: 1, username: "alice" }),
    ];
    render(
      <LeaderboardTable entries={entries} currentUserId="not-in-list" />
    );

    expect(screen.queryByText("(you)")).not.toBeInTheDocument();
  });

  it("does not show '(you)' when currentUserId is undefined", () => {
    const entries = [
      makeEntry({ id: "u1", rank: 1, username: "alice" }),
    ];
    render(<LeaderboardTable entries={entries} />);

    expect(screen.queryByText("(you)")).not.toBeInTheDocument();
  });

  it("applies medal styling classes for rank 1", () => {
    const entries = [makeEntry({ id: "u1", rank: 1 })];
    const { container } = render(<LeaderboardTable entries={entries} />);

    const badge = screen.getByText("1");
    expect(badge.className).toContain("from-yellow-400");
  });

  it("applies medal styling classes for rank 2", () => {
    const entries = [makeEntry({ id: "u2", rank: 2 })];
    render(<LeaderboardTable entries={entries} />);

    const badge = screen.getByText("2");
    expect(badge.className).toContain("from-gray-300");
  });

  it("applies medal styling classes for rank 3", () => {
    const entries = [makeEntry({ id: "u3", rank: 3 })];
    render(<LeaderboardTable entries={entries} />);

    const badge = screen.getByText("3");
    expect(badge.className).toContain("from-amber-600");
  });

  it("displays correct rank format: 1st, 2nd, 3rd, 4th", () => {
    const entries = [
      makeEntry({ id: "u4", rank: 4 }),
      makeEntry({ id: "u21", rank: 21 }),
      makeEntry({ id: "u22", rank: 22 }),
      makeEntry({ id: "u23", rank: 23 }),
    ];
    render(<LeaderboardTable entries={entries} />);

    expect(screen.getByText("4th")).toBeInTheDocument();
    expect(screen.getByText("21th")).toBeInTheDocument();
    expect(screen.getByText("22th")).toBeInTheDocument();
    expect(screen.getByText("23th")).toBeInTheDocument();
  });

  it("applies font-size styling for top 3 points", () => {
    const entries = [
      makeEntry({ id: "u1", rank: 1, total_points: 200 }),
      makeEntry({ id: "u4", rank: 4, total_points: 50 }),
    ];
    render(<LeaderboardTable entries={entries} />);

    const top1Pts = screen.getByText("200 pts");
    const rank4Pts = screen.getByText("50 pts");

    expect(top1Pts).toHaveClass("text-lg");
    expect(rank4Pts).not.toHaveClass("text-lg");
  });
});
