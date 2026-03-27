import Anthropic from "@anthropic-ai/sdk";
import { GeneratedTask, TaskEvaluation } from "../lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TASK_GENERATION_PROMPT = `You are the Taskmaster from the TV show Taskmaster. Generate a single silly, creative, and doable task. The task should be completable in 5-30 minutes using items commonly found at home or in a neighborhood. Be specific about what constitutes success.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Short catchy title (max 60 chars)",
  "description": "Detailed task description with clear success criteria. Be funny and specific.",
  "difficulty": "easy",
  "submission_type": "image",
  "max_points": 3
}

Rules:
- difficulty must be "easy", "medium", or "hard"
- submission_type must be "image" or "text"
- max_points: easy=3, medium=7, hard=10
- "image" tasks require photo proof, "text" tasks require a written response
- Tasks must be safe, legal, and doable indoors or in a neighborhood
- Be creative and funny in the style of Taskmaster
- Vary between image and text tasks
- Do not include any text outside the JSON object`;

export async function generateTask(): Promise<GeneratedTask> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: TASK_GENERATION_PROMPT }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse task generation response");
  }

  const task: GeneratedTask = JSON.parse(jsonMatch[0]);

  // Validate and enforce point rules
  const pointMap = { easy: 3, medium: 7, hard: 10 };
  task.max_points = pointMap[task.difficulty] || 3;

  return task;
}

export async function evaluateSubmission(
  title: string,
  description: string,
  difficulty: string,
  maxPoints: number,
  submissionType: string,
  submission: string
): Promise<TaskEvaluation> {
  const prompt = `You are the Taskmaster, judging a task completion. Be entertaining but fair.

Task: ${title}
Description: ${description}
Difficulty: ${difficulty}
Max Points: ${maxPoints}
Submission Type: ${submissionType}

User's Submission:
${submission}

Rate the completion from 1 to ${maxPoints} points. Consider:
- Did they actually complete the task?
- Creativity and effort
- How well they met the specific criteria

Respond ONLY with valid JSON:
{
  "points": <number from 1 to ${maxPoints}>,
  "feedback": "Brief entertaining feedback in Taskmaster style (2-3 sentences)"
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse evaluation response");
  }

  const evaluation: TaskEvaluation = JSON.parse(jsonMatch[0]);
  evaluation.points = Math.min(
    Math.max(1, Math.round(evaluation.points)),
    maxPoints
  );

  return evaluation;
}
