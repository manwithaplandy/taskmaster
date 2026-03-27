const { mockCreate } = vi.hoisted(() => {
  return { mockCreate: vi.fn() };
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

import {
  parseJsonResponse,
  generateTask,
  evaluateSubmission,
} from "./claude";

function fakeResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

describe("parseJsonResponse", () => {
  it("parses pure JSON input", () => {
    const result = parseJsonResponse<{ a: number }>(
      '{"a": 1}',
      "test"
    );
    expect(result).toEqual({ a: 1 });
  });

  it("parses JSON with leading/trailing whitespace", () => {
    const result = parseJsonResponse<{ x: string }>(
      '   \n  {"x": "hello"}  \n  ',
      "test"
    );
    expect(result).toEqual({ x: "hello" });
  });

  it("parses JSON with nested objects", () => {
    const input = '{"outer": {"inner": {"deep": true}}}';
    const result = parseJsonResponse<any>(input, "test");
    expect(result.outer.inner.deep).toBe(true);
  });

  it("extracts JSON embedded in markdown code block", () => {
    const input = `Here is the result:
\`\`\`json
{"title": "Do a dance", "points": 5}
\`\`\`
Hope that helps!`;
    const result = parseJsonResponse<{ title: string; points: number }>(
      input,
      "test"
    );
    expect(result).toEqual({ title: "Do a dance", points: 5 });
  });

  it("extracts JSON preceded by plain text", () => {
    const input = 'Sure, here you go: {"value": 42} end';
    const result = parseJsonResponse<{ value: number }>(input, "test");
    expect(result).toEqual({ value: 42 });
  });

  it("extracts JSON with nested braces from surrounding text", () => {
    const input =
      'Prefix text {"a": {"b": 2}, "c": [1,2,3]} suffix text';
    const result = parseJsonResponse<any>(input, "test");
    expect(result).toEqual({ a: { b: 2 }, c: [1, 2, 3] });
  });

  it("extracts only the first JSON object when multiple exist", () => {
    const input = 'first: {"x": 1} second: {"x": 2}';
    const result = parseJsonResponse<{ x: number }>(input, "test");
    expect(result).toEqual({ x: 1 });
  });

  it("throws with descriptive error when no JSON object is found", () => {
    expect(() => parseJsonResponse("no json here", "evaluation")).toThrow(
      "Failed to parse evaluation response: no JSON object found"
    );
  });

  it("throws with descriptive error for unbalanced braces", () => {
    expect(() =>
      parseJsonResponse('{"key": "value"', "task generation")
    ).toThrow(
      "Failed to parse task generation response: unbalanced braces"
    );
  });

  it("includes context name in error message", () => {
    expect(() =>
      parseJsonResponse("nothing useful", "my-context")
    ).toThrow("my-context");
  });

  it("throws on empty string", () => {
    expect(() => parseJsonResponse("", "test")).toThrow(
      "no JSON object found"
    );
  });

  it("throws on whitespace-only string", () => {
    expect(() => parseJsonResponse("   \n\t  ", "test")).toThrow(
      "no JSON object found"
    );
  });
});

describe("generateTask", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns a generated task from a valid API response", async () => {
    const taskJson = {
      title: "Balance a spoon on your nose",
      description: "You must balance a spoon on your nose for 10 seconds.",
      difficulty: "easy",
      submission_type: "image",
      max_points: 3,
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    const task = await generateTask();

    expect(task).toEqual(taskJson);
  });

  it("calls the API with correct model and parameters", async () => {
    const taskJson = {
      title: "Test",
      description: "Desc",
      difficulty: "easy",
      submission_type: "text",
      max_points: 3,
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    await generateTask();

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(512);
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0].role).toBe("user");
    expect(typeof callArgs.messages[0].content).toBe("string");
  });

  it("enforces max_points=3 for easy tasks", async () => {
    const taskJson = {
      title: "Easy task",
      description: "Do something easy",
      difficulty: "easy",
      submission_type: "text",
      max_points: 999, // Claude returned wrong points
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    const task = await generateTask();

    expect(task.max_points).toBe(3);
  });

  it("enforces max_points=7 for medium tasks", async () => {
    const taskJson = {
      title: "Medium task",
      description: "Do something medium",
      difficulty: "medium",
      submission_type: "image",
      max_points: 1,
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    const task = await generateTask();

    expect(task.max_points).toBe(7);
  });

  it("enforces max_points=10 for hard tasks", async () => {
    const taskJson = {
      title: "Hard task",
      description: "Do something hard",
      difficulty: "hard",
      submission_type: "text",
      max_points: 5,
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    const task = await generateTask();

    expect(task.max_points).toBe(10);
  });

  it("defaults to max_points=3 for unknown difficulty", async () => {
    const taskJson = {
      title: "Mystery task",
      description: "Something mysterious",
      difficulty: "legendary",
      submission_type: "image",
      max_points: 50,
    };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(taskJson)));

    const task = await generateTask();

    expect(task.max_points).toBe(3);
  });

  it("handles JSON wrapped in markdown from API response", async () => {
    const taskJson = {
      title: "Wrapped task",
      description: "Wrapped desc",
      difficulty: "medium",
      submission_type: "text",
      max_points: 7,
    };
    const responseText = `Here is the task:\n\`\`\`json\n${JSON.stringify(taskJson)}\n\`\`\``;
    mockCreate.mockResolvedValueOnce(fakeResponse(responseText));

    const task = await generateTask();

    expect(task.title).toBe("Wrapped task");
    expect(task.max_points).toBe(7);
  });

  it("throws when API returns non-text content block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
    });

    await expect(generateTask()).rejects.toThrow();
  });

  it("throws when API returns empty text", async () => {
    mockCreate.mockResolvedValueOnce(fakeResponse(""));

    await expect(generateTask()).rejects.toThrow("no JSON object found");
  });

  it("propagates API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    await expect(generateTask()).rejects.toThrow("API rate limit exceeded");
  });
});

describe("evaluateSubmission", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  const defaultArgs = {
    title: "Stack cans",
    description: "Stack 5 cans into a pyramid",
    difficulty: "medium",
    maxPoints: 7,
    submissionType: "text",
    submissionText: "I stacked 5 cans perfectly!",
    submissionImageUrl: undefined as string | undefined,
  };

  function callEvaluate(overrides: Partial<typeof defaultArgs> = {}) {
    const a = { ...defaultArgs, ...overrides };
    return evaluateSubmission(
      a.title,
      a.description,
      a.difficulty,
      a.maxPoints,
      a.submissionType,
      a.submissionText,
      a.submissionImageUrl
    );
  }

  it("returns evaluation for a text submission", async () => {
    const evalJson = { points: 5, feedback: "Brilliant effort!" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate();

    expect(result.points).toBe(5);
    expect(result.feedback).toBe("Brilliant effort!");
  });

  it("passes text submission content as a string prompt", async () => {
    const evalJson = { points: 3, feedback: "Ok" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate({ submissionType: "text", submissionText: "My answer" });

    const callArgs = mockCreate.mock.calls[0][0];
    const content = callArgs.messages[0].content;
    expect(typeof content).toBe("string");
    expect(content).toContain("Stack cans");
    expect(content).toContain("Stack 5 cans into a pyramid");
    expect(content).toContain("My answer");
  });

  it("includes task metadata in the text prompt", async () => {
    const evalJson = { points: 1, feedback: "Meh" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate({ difficulty: "hard", maxPoints: 10 });

    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(content).toContain("Difficulty: hard");
    expect(content).toContain("Max Points: 10");
  });

  it("handles missing submissionText gracefully", async () => {
    const evalJson = { points: 1, feedback: "Nothing submitted" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate({ submissionText: undefined });

    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(typeof content).toBe("string");
    expect(content).toContain("User's Submission:");
  });

  it("builds multipart content for image submissions", async () => {
    const evalJson = { points: 6, feedback: "Great photo!" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate({
      submissionType: "image",
      submissionImageUrl: "https://example.com/photo.jpg",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const content = callArgs.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(2);

    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("Stack cans");

    expect(content[1].type).toBe("image");
    expect(content[1].source.type).toBe("url");
    expect(content[1].source.url).toBe("https://example.com/photo.jpg");
  });

  it("falls back to text prompt when submissionType is image but no URL provided", async () => {
    const evalJson = { points: 2, feedback: "No image..." };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate({
      submissionType: "image",
      submissionImageUrl: undefined,
      submissionText: "I did it but no photo",
    });

    const content = mockCreate.mock.calls[0][0].messages[0].content;
    expect(typeof content).toBe("string");
    expect(content).toContain("I did it but no photo");
  });

  it("calls the API with correct model and max_tokens", async () => {
    const evalJson = { points: 3, feedback: "Fine" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    await callEvaluate();

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(256);
  });

  it("clamps points of 0 up to 1 (minimum)", async () => {
    const evalJson = { points: 0, feedback: "Terrible" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(1);
  });

  it("clamps negative points up to 1", async () => {
    const evalJson = { points: -5, feedback: "Awful" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(1);
  });

  it("clamps points exceeding maxPoints", async () => {
    const evalJson = { points: 100, feedback: "Too generous" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(7);
  });

  it("rounds fractional points to nearest integer", async () => {
    const evalJson = { points: 4.7, feedback: "Almost 5" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(5);
  });

  it("rounds down fractional points below .5", async () => {
    const evalJson = { points: 4.2, feedback: "Closer to 4" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(4);
  });

  it("clamps after rounding: 0.4 rounds to 0, then clamps to 1", async () => {
    const evalJson = { points: 0.4, feedback: "Barely tried" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 5 });

    expect(result.points).toBe(1);
  });

  it("clamps after rounding: 7.6 rounds to 8, then clamps to maxPoints=7", async () => {
    const evalJson = { points: 7.6, feedback: "Way too high" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(7);
  });

  it("preserves exact integer points within valid range", async () => {
    const evalJson = { points: 3, feedback: "Solid" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(3);
  });

  it("handles maxPoints=1 edge case (all valid points become 1)", async () => {
    const evalJson = { points: 5, feedback: "Only one option" };
    mockCreate.mockResolvedValueOnce(fakeResponse(JSON.stringify(evalJson)));

    const result = await callEvaluate({ maxPoints: 1 });

    expect(result.points).toBe(1);
  });

  it("throws when API returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce(fakeResponse("not json at all"));

    await expect(callEvaluate()).rejects.toThrow(
      "no JSON object found"
    );
  });

  it("propagates API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Server error"));

    await expect(callEvaluate()).rejects.toThrow("Server error");
  });

  it("handles JSON wrapped in extra text from API", async () => {
    const evalJson = { points: 4, feedback: "Nice effort" };
    const wrapped = `Here is my evaluation:\n${JSON.stringify(evalJson)}\nHope that helps!`;
    mockCreate.mockResolvedValueOnce(fakeResponse(wrapped));

    const result = await callEvaluate({ maxPoints: 7 });

    expect(result.points).toBe(4);
    expect(result.feedback).toBe("Nice effort");
  });
});
