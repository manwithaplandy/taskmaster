import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../lib/types";
import { requireAuth } from "./auth";

const mockGetUser = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

function createMockReq(
  headers: Record<string, string> = {}
): AuthenticatedRequest {
  return {
    headers,
  } as AuthenticatedRequest;
}

function createMockRes(): Response {
  const res = {} as Response;
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    mockGetUser.mockReset();
  });

  it("returns 401 when no authorization header is present", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is just "Bearer " (empty token)', async () => {
    const req = createMockReq({ authorization: "Bearer " });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization header is an empty string", async () => {
    const req = createMockReq({ authorization: "" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.userId and req.userEmail and calls next() on valid token", async () => {
    const fakeUser = {
      id: "user-abc-123",
      email: "alice@example.com",
    };
    mockGetUser.mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const req = createMockReq({ authorization: "Bearer valid-token-xyz" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith("valid-token-xyz");
    expect(req.userId).toBe("user-abc-123");
    expect(req.userEmail).toBe("alice@example.com");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("returns 401 when supabase returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Token expired"),
    });

    const req = createMockReq({ authorization: "Bearer expired-token" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when supabase returns null user without an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createMockReq({ authorization: "Bearer unknown-token" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when supabase returns both an error and null user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Something went wrong"),
    });

    const req = createMockReq({ authorization: "Bearer bad-token" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it('strips the "Bearer " prefix and passes only the token to supabase', async () => {
    const fakeUser = { id: "u1", email: "bob@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const req = createMockReq({
      authorization: "Bearer my-secret-jwt-token",
    });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith("my-secret-jwt-token");
  });

  it("passes the raw header value when it does not start with Bearer", async () => {
    const fakeUser = { id: "u2", email: "carol@example.com" };
    mockGetUser.mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const req = createMockReq({ authorization: "raw-token-no-prefix" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith("raw-token-no-prefix");
    expect(next).toHaveBeenCalled();
  });

  it("sets req.userEmail to undefined when user has no email", async () => {
    const fakeUser = { id: "u3", email: undefined };
    mockGetUser.mockResolvedValue({
      data: { user: fakeUser },
      error: null,
    });

    const req = createMockReq({ authorization: "Bearer valid-token" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(req.userId).toBe("u3");
    expect(req.userEmail).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("calls next() exactly once on successful authentication", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u4", email: "d@e.com" } },
      error: null,
    });

    const req = createMockReq({ authorization: "Bearer tok" });
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("chains res.status().json() correctly on auth failure", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledBefore(res.json as ReturnType<typeof vi.fn>);
  });
});
