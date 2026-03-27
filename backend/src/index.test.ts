import type { Express } from "express";

const {
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockRequireAuth,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockRequireAuth = vi.fn((req: any, _res: any, next: any) => {
    req.userId = "user-123";
    req.userEmail = "test@example.com";
    next();
  });
  return { mockFrom, mockSelect, mockEq, mockSingle, mockRequireAuth };
});

vi.mock("./lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock("./middleware/auth", () => ({
  requireAuth: mockRequireAuth,
}));

let capturedApp: Express;

vi.mock("express", async (importOriginal) => {
  const actual: any = await importOriginal();
  const originalExpress = actual.default || actual;

  const wrappedExpress = (...args: any[]) => {
    const app = originalExpress(...args);
    app.listen = (..._listenArgs: any[]) => {
      capturedApp = app;
      return { close: vi.fn(), address: () => ({ port: 3001 }) };
    };
    capturedApp = app;
    return app;
  };

  Object.keys(originalExpress).forEach((key) => {
    (wrappedExpress as any)[key] = (originalExpress as any)[key];
  });

  return {
    ...actual,
    default: wrappedExpress,
  };
});

function makeRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: { headers?: Record<string, string> } = {}
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headers[k.toLowerCase()] = v;
      }
    }

    const req: any = {
      method,
      url: path,
      path,
      baseUrl: "",
      originalUrl: path,
      headers,
      query: {},
      params: {},
      body: {},
      get(name: string) {
        return this.headers[name.toLowerCase()];
      },
      header(name: string) {
        return this.headers[name.toLowerCase()];
      },
      is() {
        return false;
      },
    };

    const res: any = {
      statusCode: 200,
      _headers: {} as Record<string, string>,
      _body: null as any,
      _ended: false,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this._body = data;
        this._ended = true;
        this.setHeader("content-type", "application/json");
        resolve({ statusCode: this.statusCode, body: data });
        return this;
      },
      send(data: any) {
        this._body = data;
        this._ended = true;
        resolve({ statusCode: this.statusCode, body: data });
        return this;
      },
      end() {
        this._ended = true;
        resolve({ statusCode: this.statusCode, body: this._body });
      },
      setHeader(name: string, value: string) {
        this._headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return this._headers[name.toLowerCase()];
      },
      set(name: string, value: string) {
        this._headers[name.toLowerCase()] = value;
        return this;
      },
    };

    try {
      (capturedApp as any).handle(req, res, (err: any) => {
        if (err) reject(err);
        else resolve({ statusCode: res.statusCode, body: res._body });
      });
    } catch (e) {
      reject(e);
    }
  });
}

beforeAll(async () => {
  await import("./index");
});

describe("GET /health", () => {
  it("returns { status: 'ok' }", async () => {
    const { statusCode, body } = await makeRequest("GET", "/health");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockRequireAuth.mockImplementation((req: any, _res: any, next: any) => {
      req.userId = "user-123";
      req.userEmail = "test@example.com";
      next();
    });
  });

  it("returns profile for authenticated user", async () => {
    const profileData = {
      id: "user-123",
      username: "testuser",
      email: "test@example.com",
      score: 42,
    };
    mockSingle.mockResolvedValue({ data: profileData, error: null });

    const { statusCode, body } = await makeRequest("GET", "/api/profile");

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ profile: profileData });
  });

  it("returns 404 when profile is not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { statusCode, body } = await makeRequest("GET", "/api/profile");

    expect(statusCode).toBe(404);
    expect(body).toEqual({ error: "Profile not found" });
  });

  it("returns 404 on supabase error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const { statusCode, body } = await makeRequest("GET", "/api/profile");

    expect(statusCode).toBe(404);
    expect(body).toEqual({ error: "Profile not found" });
  });
});
