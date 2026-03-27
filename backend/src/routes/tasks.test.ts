import type { Response } from "express";
import type { AuthenticatedRequest } from "../lib/types";

const {
  mockChain,
  mockGenerateTask,
  mockEvaluateSubmission,
  setMockResult,
  setMockRpcResult,
  rewireChainDefaults,
} = vi.hoisted(() => {
  let _mockResult: { data: unknown; error: unknown } = { data: null, error: null };
  let _mockRpcResult: { data: unknown; error: unknown } = { data: null, error: null };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    rpc: vi.fn(),
  };

  function wireDefaults() {
    for (const key of Object.keys(chain)) {
      if (key === "single") {
        chain[key].mockImplementation(() => Promise.resolve(_mockResult));
      } else if (key === "range") {
        chain[key].mockImplementation(() => Promise.resolve(_mockResult));
      } else if (key === "rpc") {
        chain[key].mockImplementation(() => Promise.resolve(_mockRpcResult));
      } else {
        chain[key].mockReturnValue(chain);
      }
    }
  }

  wireDefaults();

  return {
    mockChain: chain,
    mockGenerateTask: vi.fn(),
    mockEvaluateSubmission: vi.fn(),
    setMockResult(r: { data: unknown; error: unknown }) {
      _mockResult = r;
    },
    setMockRpcResult(r: { data: unknown; error: unknown }) {
      _mockRpcResult = r;
    },
    rewireChainDefaults: wireDefaults,
  };
});

vi.mock("../lib/supabase", () => ({
  supabase: mockChain,
}));

vi.mock("../services/claude", () => ({
  generateTask: (...args: unknown[]) => mockGenerateTask(...args),
  evaluateSubmission: (...args: unknown[]) => mockEvaluateSubmission(...args),
}));

vi.mock("../middleware/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import router from "./tasks";

type Layer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: { handle: Function }[];
  };
};

function getHandler(method: string, path: string) {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  for (const layer of layers) {
    if (
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method]
    ) {
      const stack = layer.route.stack;
      return stack[stack.length - 1].handle;
    }
  }
  throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
}

const generateHandler = getHandler("post", "/generate");
const activeHandler = getHandler("get", "/active");
const submitHandler = getHandler("post", "/:id/submit");
const skipHandler = getHandler("post", "/:id/skip");
const historyHandler = getHandler("get", "/history");

const TEST_USER_ID = "user-abc-123";

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    userId: TEST_USER_ID,
    params: {},
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function makeRes() {
  const res: Partial<Response> & { _status: number; _json: unknown } = {
    _status: 200,
    _json: undefined,
    status(code: number) {
      res._status = code;
      return res as Response;
    },
    json(body: unknown) {
      res._json = body;
      return res as Response;
    },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  setMockResult({ data: null, error: null });
  setMockRpcResult({ data: null, error: null });
  rewireChainDefaults();
});

describe("POST /generate", () => {
  it("returns existing active task if one exists", async () => {
    const existingTask = { id: "task-1", title: "Existing", status: "active" };
    setMockResult({ data: existingTask, error: null });
    rewireChainDefaults();

    const req = makeReq();
    const res = makeRes();

    await generateHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ task: existingTask });
    expect(mockGenerateTask).not.toHaveBeenCalled();
  });

  it("generates and saves a new task when no active task", async () => {
    const generated = {
      title: "New Task",
      description: "Do something funny",
      difficulty: "easy",
      submission_type: "text",
      max_points: 3,
    };
    const savedTask = { id: "task-2", ...generated, status: "active" };

    let callCount = 0;
    mockChain.single.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: savedTask, error: null });
    });

    mockGenerateTask.mockResolvedValue(generated);

    const req = makeReq();
    const res = makeRes();

    await generateHandler(req, res);

    expect(mockGenerateTask).toHaveBeenCalledOnce();
    expect(mockChain.from).toHaveBeenCalledWith("tasks");
    expect(mockChain.insert).toHaveBeenCalledWith({
      user_id: TEST_USER_ID,
      title: generated.title,
      description: generated.description,
      difficulty: generated.difficulty,
      submission_type: generated.submission_type,
      max_points: generated.max_points,
      status: "active",
    });
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ task: savedTask });
  });

  it("returns 500 when supabase insert fails", async () => {
    const generated = {
      title: "Task",
      description: "Desc",
      difficulty: "easy",
      submission_type: "text",
      max_points: 3,
    };

    let callCount = 0;
    mockChain.single.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: { message: "Insert error" } });
    });

    mockGenerateTask.mockResolvedValue(generated);

    const req = makeReq();
    const res = makeRes();

    await generateHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: "Failed to save task" });
  });

  it("returns 500 when generateTask throws", async () => {
    mockChain.single.mockImplementation(() =>
      Promise.resolve({ data: null, error: null })
    );

    mockGenerateTask.mockRejectedValue(new Error("Claude API down"));

    const req = makeReq();
    const res = makeRes();

    await generateHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: "Failed to generate task" });
  });
});

describe("GET /active", () => {
  it("returns active task when one exists", async () => {
    const task = { id: "task-1", title: "Active Task", status: "active" };
    setMockResult({ data: task, error: null });
    rewireChainDefaults();

    const req = makeReq();
    const res = makeRes();

    await activeHandler(req, res);

    expect(mockChain.from).toHaveBeenCalledWith("tasks");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    expect(mockChain.eq).toHaveBeenCalledWith("status", "active");
    expect(mockChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockChain.limit).toHaveBeenCalledWith(1);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ task });
  });

  it("returns null when no active task", async () => {
    const req = makeReq();
    const res = makeRes();

    await activeHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ task: null });
  });
});

describe("POST /:id/submit", () => {
  const textTask = {
    id: "task-10",
    title: "Write a limerick",
    description: "Write a limerick about coding",
    difficulty: "easy",
    max_points: 3,
    submission_type: "text",
    status: "active",
  };

  const imageTask = {
    ...textTask,
    id: "task-11",
    title: "Photo proof",
    submission_type: "image",
  };

  it("successful submission with text", async () => {
    const updatedTask = { ...textTask, status: "completed", points_earned: 3 };
    const evaluation = { points: 3, feedback: "Brilliant limerick!" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: textTask, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    mockEvaluateSubmission.mockResolvedValue(evaluation);

    const req = makeReq({
      params: { id: "task-10" },
      body: { text: "There once was a coder named Ray..." },
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(mockEvaluateSubmission).toHaveBeenCalledWith(
      textTask.title,
      textTask.description,
      textTask.difficulty,
      textTask.max_points,
      textTask.submission_type,
      "There once was a coder named Ray...",
      undefined
    );
    expect(mockChain.rpc).toHaveBeenCalledWith("complete_task", {
      p_task_id: "task-10",
      p_user_id: TEST_USER_ID,
      p_points: 3,
      p_feedback: "Brilliant limerick!",
      p_submission_text: "There once was a coder named Ray...",
      p_submission_image_url: null,
    });
    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      points: 3,
      feedback: "Brilliant limerick!",
      task: updatedTask,
    });
  });

  it("successful submission with image_url", async () => {
    const updatedTask = { ...imageTask, status: "completed", points_earned: 3 };
    const evaluation = { points: 3, feedback: "Nice photo!" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: imageTask, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    mockEvaluateSubmission.mockResolvedValue(evaluation);

    const req = makeReq({
      params: { id: "task-11" },
      body: { image_url: "https://example.com/photo.jpg" },
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(mockEvaluateSubmission).toHaveBeenCalledWith(
      imageTask.title,
      imageTask.description,
      imageTask.difficulty,
      imageTask.max_points,
      imageTask.submission_type,
      undefined,
      "https://example.com/photo.jpg"
    );
    expect(mockChain.rpc).toHaveBeenCalledWith("complete_task", {
      p_task_id: "task-11",
      p_user_id: TEST_USER_ID,
      p_points: 3,
      p_feedback: "Nice photo!",
      p_submission_text: null,
      p_submission_image_url: "https://example.com/photo.jpg",
    });
    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      points: 3,
      feedback: "Nice photo!",
      task: updatedTask,
    });
  });

  it("returns 404 when task not found", async () => {
    setMockResult({ data: null, error: { message: "Not found" } });
    rewireChainDefaults();

    const req = makeReq({
      params: { id: "nonexistent" },
      body: { text: "My answer" },
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: "Active task not found" });
    expect(mockEvaluateSubmission).not.toHaveBeenCalled();
  });

  it("returns 400 when image task submitted without image_url", async () => {
    setMockResult({ data: imageTask, error: null });
    rewireChainDefaults();

    const req = makeReq({
      params: { id: "task-11" },
      body: { text: "just text, no image" },
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: "Submission content required" });
    expect(mockEvaluateSubmission).not.toHaveBeenCalled();
  });

  it("returns 400 when text task submitted without text", async () => {
    setMockResult({ data: textTask, error: null });
    rewireChainDefaults();

    const req = makeReq({
      params: { id: "task-10" },
      body: {},
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: "Submission content required" });
    expect(mockEvaluateSubmission).not.toHaveBeenCalled();
  });

  it("returns 500 when evaluateSubmission throws", async () => {
    setMockResult({ data: textTask, error: null });
    rewireChainDefaults();
    mockEvaluateSubmission.mockRejectedValue(new Error("Claude error"));

    const req = makeReq({
      params: { id: "task-10" },
      body: { text: "My answer" },
    });
    const res = makeRes();

    await submitHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: "Failed to evaluate submission" });
  });
});

describe("POST /:id/skip", () => {
  const activeTask = {
    id: "task-20",
    title: "Some task",
    status: "active",
    user_id: TEST_USER_ID,
  };

  it("successful skip with correct penalty (0 previous skips -> -1 penalty)", async () => {
    const updatedTask = { ...activeTask, status: "skipped" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: activeTask, error: null });
      if (singleCallCount === 2)
        return Promise.resolve({ data: { consecutive_skips: 0 }, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    const req = makeReq({ params: { id: "task-20" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(mockChain.rpc).toHaveBeenCalledWith("skip_task", {
      p_task_id: "task-20",
      p_user_id: TEST_USER_ID,
      p_penalty: -1,
    });
    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      penalty: -1,
      consecutive_skips: 1,
      task: updatedTask,
    });
  });

  it("penalty increases with consecutive skips (1 previous skip -> -2 penalty)", async () => {
    const updatedTask = { ...activeTask, status: "skipped" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: activeTask, error: null });
      if (singleCallCount === 2)
        return Promise.resolve({ data: { consecutive_skips: 1 }, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    const req = makeReq({ params: { id: "task-20" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(mockChain.rpc).toHaveBeenCalledWith("skip_task", {
      p_task_id: "task-20",
      p_user_id: TEST_USER_ID,
      p_penalty: -2,
    });
    expect(res._json).toEqual({
      penalty: -2,
      consecutive_skips: 2,
      task: updatedTask,
    });
  });

  it("penalty increases further with more consecutive skips (4 previous skips -> -5 penalty)", async () => {
    const updatedTask = { ...activeTask, status: "skipped" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: activeTask, error: null });
      if (singleCallCount === 2)
        return Promise.resolve({ data: { consecutive_skips: 4 }, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    const req = makeReq({ params: { id: "task-20" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(mockChain.rpc).toHaveBeenCalledWith("skip_task", {
      p_task_id: "task-20",
      p_user_id: TEST_USER_ID,
      p_penalty: -5,
    });
    expect(res._json).toEqual({
      penalty: -5,
      consecutive_skips: 5,
      task: updatedTask,
    });
  });

  it("defaults to 0 consecutive_skips when profile is null", async () => {
    const updatedTask = { ...activeTask, status: "skipped" };

    let singleCallCount = 0;
    mockChain.single.mockImplementation(() => {
      singleCallCount++;
      if (singleCallCount === 1)
        return Promise.resolve({ data: activeTask, error: null });
      if (singleCallCount === 2)
        return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: updatedTask, error: null });
    });

    const req = makeReq({ params: { id: "task-20" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(mockChain.rpc).toHaveBeenCalledWith("skip_task", {
      p_task_id: "task-20",
      p_user_id: TEST_USER_ID,
      p_penalty: -1,
    });
    expect(res._json).toEqual({
      penalty: -1,
      consecutive_skips: 1,
      task: updatedTask,
    });
  });

  it("returns 404 when task not found", async () => {
    setMockResult({ data: null, error: { message: "Not found" } });
    rewireChainDefaults();

    const req = makeReq({ params: { id: "nonexistent" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: "Active task not found" });
    expect(mockChain.rpc).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockChain.single.mockImplementation(() => {
      throw new Error("DB connection lost");
    });

    const req = makeReq({ params: { id: "task-20" } });
    const res = makeRes();

    await skipHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: "Failed to skip task" });
  });
});

describe("GET /history", () => {
  it("returns paginated results with defaults (page=1, limit=20)", async () => {
    const tasks = [{ id: "task-1" }, { id: "task-2" }];
    setMockResult({ data: tasks, error: null });
    rewireChainDefaults();

    const req = makeReq({ query: {} });
    const res = makeRes();

    await historyHandler(req, res);

    expect(mockChain.from).toHaveBeenCalledWith("tasks");
    expect(mockChain.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    expect(mockChain.neq).toHaveBeenCalledWith("status", "active");
    expect(mockChain.order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(mockChain.range).toHaveBeenCalledWith(0, 19);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tasks, page: 1, limit: 20 });
  });

  it("respects custom page and limit", async () => {
    const tasks = [{ id: "task-5" }];
    setMockResult({ data: tasks, error: null });
    rewireChainDefaults();

    const req = makeReq({ query: { page: "3", limit: "10" } });
    const res = makeRes();

    await historyHandler(req, res);

    // offset = (3-1) * 10 = 20, range(20, 29)
    expect(mockChain.range).toHaveBeenCalledWith(20, 29);
    expect(res._json).toEqual({ tasks, page: 3, limit: 10 });
  });

  it("clamps limit to max 50", async () => {
    setMockResult({ data: [], error: null });
    rewireChainDefaults();

    const req = makeReq({ query: { limit: "999" } });
    const res = makeRes();

    await historyHandler(req, res);

    expect(mockChain.range).toHaveBeenCalledWith(0, 49);
    expect(res._json).toEqual({ tasks: [], page: 1, limit: 50 });
  });

  it("clamps limit to min 1", async () => {
    setMockResult({ data: [], error: null });
    rewireChainDefaults();

    const req = makeReq({ query: { limit: "-5" } });
    const res = makeRes();

    await historyHandler(req, res);

    expect(mockChain.range).toHaveBeenCalledWith(0, 0);
    expect(res._json).toEqual({ tasks: [], page: 1, limit: 1 });
  });

  it("clamps page to min 1", async () => {
    setMockResult({ data: [], error: null });
    rewireChainDefaults();

    const req = makeReq({ query: { page: "-2" } });
    const res = makeRes();

    await historyHandler(req, res);

    expect(mockChain.range).toHaveBeenCalledWith(0, 19);
    expect(res._json).toEqual({ tasks: [], page: 1, limit: 20 });
  });

  it("handles empty results (null data)", async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();

    await historyHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ tasks: [], page: 1, limit: 20 });
  });
});
