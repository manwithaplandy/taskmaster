const { mockFrom, mockSelect, mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockSelect = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockFrom, mockSelect, mockLimit };
});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

import router from "./leaderboard";

const handler = (() => {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === "/" && l.route?.methods?.get
  );
  if (!layer) throw new Error("GET / handler not found on router");
  return layer.route.stack[0].handle;
})();

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ limit: mockLimit });
  });

  it("returns leaderboard data on success", async () => {
    const leaderboardData = [
      { id: "1", username: "alice", score: 100 },
      { id: "2", username: "bob", score: 80 },
    ];
    mockLimit.mockResolvedValue({ data: leaderboardData, error: null });

    const req = {};
    const res = mockRes();

    await handler(req, res);

    expect(mockFrom).toHaveBeenCalledWith("leaderboard");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(res.json).toHaveBeenCalledWith({ leaderboard: leaderboardData });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns empty array when data is null", async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    const req = {};
    const res = mockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ leaderboard: [] });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 500 on supabase error", async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: "DB connection failed" },
    });

    const req = {};
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch leaderboard",
    });
  });

  it("returns empty array when data is an empty array", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    const req = {};
    const res = mockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ leaderboard: [] });
  });
});
