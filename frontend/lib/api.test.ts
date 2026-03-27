import type {
  Task,
  TaskEvaluationResult,
  SkipResult,
  LeaderboardEntry,
  Profile,
} from "./types";

vi.mock("./supabase-browser", () => {
  const supabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
      }),
      onAuthStateChange: vi.fn(
        (cb: (event: string, session: unknown) => void) => {
          // Stash the callback where tests can reach it
          (globalThis as Record<string, unknown>).__authStateCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }
      ),
    },
  };
  return { supabase };
});

const API_URL = "http://localhost:3001";

function getAuthCallback(): (event: string, session: unknown) => void {
  return (globalThis as Record<string, unknown>).__authStateCallback as (
    event: string,
    session: unknown
  ) => void;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    user_id: "user-1",
    title: "Draw a cat",
    description: "Please draw a cat",
    difficulty: "easy",
    submission_type: "image",
    max_points: 10,
    status: "active",
    points_awarded: 0,
    evaluation_feedback: null,
    submission_text: null,
    submission_image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

function simulateSignIn(token = "test-jwt-token") {
  getAuthCallback()("SIGNED_IN", { access_token: token });
}

function simulateSignOut() {
  getAuthCallback()("SIGNED_OUT", null);
}

import {
  generateTask,
  getActiveTask,
  submitTask,
  skipTask,
  getTaskHistory,
  getLeaderboard,
  getProfile,
} from "./api";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  // Ensure each test starts with no cached token
  simulateSignOut();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("apiFetch (indirect)", () => {
  describe("Authorization header", () => {
    it("includes Bearer token when user is authenticated", async () => {
      simulateSignIn("test-jwt-token");

      fetchMock.mockResolvedValueOnce(jsonResponse({ task: fakeTask() }));
      await generateTask();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        })
      );
    });

    it("omits Authorization header when no token is cached", async () => {
      simulateSignOut();

      fetchMock.mockResolvedValueOnce(jsonResponse({ task: null }));
      await getActiveTask();

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers).not.toHaveProperty("Authorization");
    });

    it("updates cached token when auth state changes", async () => {
      // Start authenticated with first token
      simulateSignIn("token-1");

      fetchMock.mockResolvedValueOnce(jsonResponse({ task: fakeTask() }));
      await generateTask();

      let [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers.Authorization).toBe("Bearer token-1");

      // Simulate token refresh
      getAuthCallback()("TOKEN_REFRESHED", { access_token: "token-2" });

      fetchMock.mockResolvedValueOnce(jsonResponse({ task: fakeTask() }));
      await generateTask();

      [, opts] = fetchMock.mock.calls[1];
      expect(opts.headers.Authorization).toBe("Bearer token-2");
    });
  });

  describe("Content-Type header", () => {
    it("always sets Content-Type to application/json", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ task: null }));
      await getActiveTask();

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("Error handling", () => {
    it("throws with error message from response body", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "Task limit reached" }, 429)
      );

      await expect(generateTask()).rejects.toThrow("Task limit reached");
    });

    it('falls back to "API error: {status}" when body has no error field', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ something: "else" }, 500)
      );

      await expect(generateTask()).rejects.toThrow("API error: 500");
    });

    it('falls back to "API error: {status}" when body is not parseable JSON', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("Internal Server Error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        })
      );

      await expect(generateTask()).rejects.toThrow("API error: 500");
    });

    it("re-throws non-abort fetch errors", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(generateTask()).rejects.toThrow("Failed to fetch");
    });
  });

  describe("Timeout via AbortController", () => {
    it("throws 'Request timed out' when the request is aborted", async () => {
      // Simulate fetch rejecting with an AbortError (the same thing that
      // happens when the internal AbortController fires after 30s).
      const abortError = new DOMException(
        "The operation was aborted.",
        "AbortError"
      );
      fetchMock.mockRejectedValueOnce(abortError);

      await expect(generateTask()).rejects.toThrow(
        "Request timed out. Please try again."
      );
    });

    it("passes an AbortSignal to fetch", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ task: null }));
      await getActiveTask();

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.signal).toBeInstanceOf(AbortSignal);
    });
  });
});

describe("generateTask", () => {
  it("calls POST /api/tasks/generate", async () => {
    const task = fakeTask();
    fetchMock.mockResolvedValueOnce(jsonResponse({ task }));

    await generateTask();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/generate`);
    expect(opts.method).toBe("POST");
  });

  it("returns the unwrapped task object", async () => {
    const task = fakeTask({ id: "task-42", title: "Draw a dog" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ task }));

    const result = await generateTask();

    expect(result).toEqual(task);
  });
});

describe("getActiveTask", () => {
  it("calls GET /api/tasks/active", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ task: null }));
    await getActiveTask();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/active`);
    expect(opts.method).toBeUndefined(); // GET is the default
  });

  it("returns the task when one is active", async () => {
    const task = fakeTask();
    fetchMock.mockResolvedValueOnce(jsonResponse({ task }));

    const result = await getActiveTask();
    expect(result).toEqual(task);
  });

  it("returns null when no active task exists", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ task: null }));

    const result = await getActiveTask();
    expect(result).toBeNull();
  });
});

describe("submitTask", () => {
  const evaluationResult: TaskEvaluationResult = {
    points: 8,
    feedback: "Great drawing!",
    task: fakeTask({ status: "completed", points_awarded: 8 }),
  };

  it("calls POST /api/tasks/:id/submit with correct endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(evaluationResult));
    await submitTask("task-1", { text: "My answer" });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/task-1/submit`);
    expect(opts.method).toBe("POST");
  });

  it("sends submission body as JSON string", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(evaluationResult));

    const submission = { text: "My text submission" };
    await submitTask("task-1", submission);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe(JSON.stringify(submission));
  });

  it("sends image_url in submission body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(evaluationResult));

    const submission = { image_url: "https://example.com/photo.png" };
    await submitTask("task-1", submission);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe(JSON.stringify(submission));
  });

  it("returns the full evaluation result (not unwrapped)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(evaluationResult));

    const result = await submitTask("task-1", { text: "answer" });
    expect(result).toEqual(evaluationResult);
  });
});

describe("skipTask", () => {
  const skipResult: SkipResult = {
    penalty: 5,
    consecutive_skips: 2,
    task: fakeTask({ status: "skipped" }),
  };

  it("calls POST /api/tasks/:id/skip", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(skipResult));
    await skipTask("task-99");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/task-99/skip`);
    expect(opts.method).toBe("POST");
  });

  it("returns the full skip result (not unwrapped)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(skipResult));

    const result = await skipTask("task-99");
    expect(result).toEqual(skipResult);
  });
});

describe("getTaskHistory", () => {
  const tasks = [fakeTask({ id: "t1" }), fakeTask({ id: "t2" })];

  it("calls GET /api/tasks/history with default page=1 and limit=20", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks }));
    await getTaskHistory();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/history?page=1&limit=20`);
  });

  it("passes custom page and limit as query params", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks }));
    await getTaskHistory(3, 50);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/tasks/history?page=3&limit=50`);
  });

  it("returns the unwrapped tasks array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks }));

    const result = await getTaskHistory();
    expect(result).toEqual(tasks);
  });

  it("returns an empty array when there is no history", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tasks: [] }));

    const result = await getTaskHistory();
    expect(result).toEqual([]);
  });
});

describe("getLeaderboard", () => {
  const leaderboard: LeaderboardEntry[] = [
    {
      id: "u1",
      username: "alice",
      total_points: 100,
      tasks_completed: 10,
      rank: 1,
    },
    {
      id: "u2",
      username: "bob",
      total_points: 80,
      tasks_completed: 8,
      rank: 2,
    },
  ];

  it("calls GET /api/leaderboard", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ leaderboard }));
    await getLeaderboard();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/leaderboard`);
  });

  it("returns the unwrapped leaderboard array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ leaderboard }));

    const result = await getLeaderboard();
    expect(result).toEqual(leaderboard);
  });
});

describe("getProfile", () => {
  const profile: Profile = {
    id: "user-1",
    username: "alice",
    total_points: 100,
    tasks_completed: 10,
    consecutive_skips: 0,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("calls GET /api/profile", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ profile }));
    await getProfile();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/profile`);
  });

  it("returns the unwrapped profile object", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ profile }));

    const result = await getProfile();
    expect(result).toEqual(profile);
  });
});

describe("HTTP error status codes", () => {
  it("handles 401 Unauthorized", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Unauthorized" }, 401)
    );
    await expect(getProfile()).rejects.toThrow("Unauthorized");
  });

  it("handles 403 Forbidden", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Forbidden" }, 403)
    );
    await expect(getProfile()).rejects.toThrow("Forbidden");
  });

  it("handles 404 Not Found", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Not found" }, 404)
    );
    await expect(getActiveTask()).rejects.toThrow("Not found");
  });

  it("handles 422 with validation error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Invalid submission format" }, 422)
    );
    await expect(submitTask("t1", { text: "" })).rejects.toThrow(
      "Invalid submission format"
    );
  });

  it("handles 503 Service Unavailable with fallback message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 503));
    await expect(getLeaderboard()).rejects.toThrow("API error: 503");
  });
});
