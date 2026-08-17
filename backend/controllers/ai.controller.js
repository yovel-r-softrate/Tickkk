require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const { successResponse, errorResponse } = require("../utils/response");
const Task = require("../models/task.model");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.5-flash-lite";

async function generateContent(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return response.text;
}

function handleAiError(res, error, context) {
  console.error(`AI ${context} error:`, error.message);
  const msg = String(error.message || "");
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return errorResponse(res, 429, "AI rate limit reached. Please wait a moment and try again.");
  }
  if (msg.includes("API_KEY") || msg.includes("permission") || msg.includes("403")) {
    return errorResponse(res, 503, "AI service is not configured properly. Please check the API key.");
  }
  return errorResponse(res, 500, "AI service temporarily unavailable. Please try again later.");
}

exports.suggestSubtasks = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return errorResponse(res, 400, "Task title is required");
    }

    const prompt = `You are a project management assistant. Given the following task, suggest 3-6 actionable subtasks that would help break it down into manageable steps.

Task Title: ${title}
${description ? `Task Description: ${description}` : ""}

Respond ONLY with a JSON array of strings. Each string is a subtask title. No markdown, no explanation.
Example: ["Subtask 1", "Subtask 2", "Subtask 3"]`;

    const text = await generateContent(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const subtasks = JSON.parse(cleaned);

    successResponse(res, 200, "Subtasks suggested successfully", { subtasks });
  } catch (error) {
    handleAiError(res, error, "suggestSubtasks");
  }
};

exports.improveDescription = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return errorResponse(res, 400, "Task title is required");
    }

    const prompt = `You are a project management assistant. Improve the following task description to be more clear, detailed, and actionable. Keep it concise (2-4 sentences).

Task Title: ${title}
${description ? `Current Description: ${description}` : "No description provided yet."}

Respond ONLY with the improved description text. No markdown formatting, no quotes, no explanation.`;

    const text = await generateContent(prompt);
    successResponse(res, 200, "Description improved successfully", { description: text.trim() });
  } catch (error) {
    handleAiError(res, error, "improveDescription");
  }
};

exports.summarizeTasks = async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return errorResponse(res, 400, "Tasks array is required");
    }

    const taskList = tasks.map((t, i) =>
      `${i + 1}. "${t.title}" - Priority: ${t.priority || "Medium"}, Status: ${t.completed ? "Completed" : "Pending"}${t.deadline ? `, Deadline: ${t.deadline}` : ""}`
    ).join("\n");

    const prompt = `You are a project management assistant. Analyze these tasks and provide a brief executive summary (3-5 sentences) covering: overall progress, key priorities, and a recommendation.

Tasks:
${taskList}

Respond ONLY with the summary text. No markdown, no headers.`;

    const text = await generateContent(prompt);
    successResponse(res, 200, "Tasks summarized successfully", { summary: text.trim() });
  } catch (error) {
    handleAiError(res, error, "summarizeTasks");
  }
};

exports.suggestPriority = async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    if (!title) {
      return errorResponse(res, 400, "Task title is required");
    }

    const prompt = `You are a project management assistant. Based on the task details, suggest an appropriate priority level.

Task Title: ${title}
${description ? `Description: ${description}` : ""}
${deadline ? `Deadline: ${deadline}` : ""}

Respond ONLY with a JSON object: {"priority": "Low" | "Medium" | "High", "reason": "brief reason"}
No markdown, no explanation outside the JSON.`;

    const text = await generateContent(prompt);
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    successResponse(res, 200, "Priority suggested successfully", result);
  } catch (error) {
    handleAiError(res, error, "suggestPriority");
  }
};

exports.askAssistant = async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question) {
      return errorResponse(res, 400, "Question is required");
    }

    let dbContext = "";
    const user = req.currentUser;
    
    if (user) {
      const filter = user.organization 
        ? { organization: user.organization } 
        : { user: user._id, organization: null };

      if (user.role !== 'admin' && user.role !== 'super') {
        filter.user = user._id;
      }
      
      const tasks = await Task.find(filter).populate('user', 'firstName lastName email').limit(30);
      
      if (tasks.length > 0) {
        dbContext = "User's real live tasks from the database:\n" + tasks.map((t, i) => {
          const assigneeName = t.user ? (t.user.firstName ? `${t.user.firstName} ${t.user.lastName || ''}`.trim() : t.user.email) : 'Unassigned';
          return `${i + 1}. "${t.title}" - Assigned To: ${assigneeName}, Priority: ${t.priority || "Medium"}, Status: ${t.completed ? "Completed" : "Pending"}${t.deadline ? `, Deadline: ${new Date(t.deadline).toLocaleDateString()}` : ""}`;
        }).join("\n");
      } else {
        dbContext = "User currently has no tasks in the database.";
      }
    }

    const prompt = `You are a helpful project management AI assistant embedded in the Tickkk task management application. Answer the user's question concisely and helpfully.

${context ? `Context from the frontend UI:\n${context}\n` : ""}
${dbContext ? `\n${dbContext}\n` : ""}

User Question: ${question}

Keep your answer brief (2-5 sentences) and actionable. Use the user's real tasks to provide personalized advice when relevant. No markdown formatting.`;

    const text = await generateContent(prompt);
    successResponse(res, 200, "Response generated successfully", { answer: text.trim() });
  } catch (error) {
    handleAiError(res, error, "askAssistant");
  }
};
