import { render, screen } from "@testing-library/react";
import PointsBadge from "./PointsBadge";

describe("PointsBadge", () => {
  it("renders 'Easy' label for easy difficulty", () => {
    render(<PointsBadge difficulty="easy" maxPoints={10} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
  });

  it("renders 'Medium' label for medium difficulty", () => {
    render(<PointsBadge difficulty="medium" maxPoints={20} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders 'Hard' label for hard difficulty", () => {
    render(<PointsBadge difficulty="hard" maxPoints={30} />);
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("shows 'X/Y pts' when points are provided", () => {
    render(<PointsBadge difficulty="easy" points={5} maxPoints={10} />);
    expect(screen.getByText("5/10 pts")).toBeInTheDocument();
  });

  it("shows 'Y pts' when points are not provided", () => {
    render(<PointsBadge difficulty="easy" maxPoints={10} />);
    expect(screen.getByText("10 pts")).toBeInTheDocument();
  });

  it("applies perfect score styling when points === maxPoints", () => {
    render(<PointsBadge difficulty="hard" points={30} maxPoints={30} />);
    const ptsElement = screen.getByText("30/30 pts");
    expect(ptsElement).toHaveClass("animate-pulse-glow");
    expect(ptsElement).toHaveClass("text-accent");
    expect(ptsElement).toHaveClass("font-bold");
  });

  it("does not apply perfect score styling when points < maxPoints", () => {
    render(<PointsBadge difficulty="hard" points={15} maxPoints={30} />);
    const ptsElement = screen.getByText("15/30 pts");
    expect(ptsElement).not.toHaveClass("animate-pulse-glow");
    expect(ptsElement).not.toHaveClass("font-bold");
  });

  it("does not apply perfect score styling when points are undefined", () => {
    render(<PointsBadge difficulty="easy" maxPoints={10} />);
    const ptsElement = screen.getByText("10 pts");
    expect(ptsElement).not.toHaveClass("animate-pulse-glow");
  });

  it("applies correct color classes for each difficulty", () => {
    const { rerender } = render(
      <PointsBadge difficulty="easy" maxPoints={10} />
    );
    expect(screen.getByText("Easy").className).toContain("bg-easy/20");

    rerender(<PointsBadge difficulty="medium" maxPoints={20} />);
    expect(screen.getByText("Medium").className).toContain("bg-medium/20");

    rerender(<PointsBadge difficulty="hard" maxPoints={30} />);
    expect(screen.getByText("Hard").className).toContain("bg-hard/20");
  });
});
