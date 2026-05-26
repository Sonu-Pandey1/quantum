import type { Question } from './questions';

export interface AIGradeResult {
  isValid: boolean;
  score: number;      // 0-100
  feedback: string;   // markdown feedback
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UserProgressionState {
  displayName?: string;
  archetype?: string;
  level?: Record<string, number>;
  xp?: Record<string, number>;
  totalXp?: number;
  totalLevel?: number;
  streakCount?: number;
  goals?: string;
  theme?: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Retrieves the Gemini API Key from LocalStorage or Vite Environment variables.
 */
export function getGeminiApiKey(): string {
  const customKey = localStorage.getItem('quantum_counsel_api_key');
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
  // Fallback to Vite env variable if present
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  return envKey.trim();
}

/**
 * Checks if a valid API key is configured.
 */
export function isApiKeyConfigured(): boolean {
  return !!getGeminiApiKey();
}

/**
 * Helper to call the direct Gemini REST API.
 */
async function callGemini(prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Neural API Key not configured. Please input your key in Neural Settings.');
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const requestBody: any = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (jsonMode) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`Gemini Link failed: ${errMsg}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

/**
 * Evaluates a practice coding answer using the Gemini API.
 */
export async function gradeAnswerWithAI(question: Question, userInput: string, sandboxLogs?: string[]): Promise<AIGradeResult> {
  const systemInstruction = `You are a strict, elite Computer Science Professor, senior ABAP Architect, and tech recruiter. Your job is to strictly grade and evaluate the user's coding/text submission for a given practice objective.
You must return ONLY a valid JSON object matching the following TypeScript interface:
interface AIGradeResult {
  isValid: boolean;  // Must be true if the user's code/answer is semantically correct, logically viable, and answers the objective. Be extremely strict for Hard questions! Mark false if the solution is generic filler, boilerplate, or placeholder code.
  score: number;      // A score between 0 and 100 based on logical correctness, efficiency, style, and structure.
  feedback: string;   // A constructive code review and feedback in Markdown format. Highlight positive aspects of their approach and provide concrete recommendations for improvement. Do not just state the answer—help them learn how to write it.
}
Do NOT include any markdown code blocks (like \`\`\`json) or conversational text around your JSON output. Return ONLY the raw JSON string.`;

  const prompt = `Objective Question Details:
- Title: "${question.title}"
- Category: ${question.category}
- Difficulty: ${question.difficulty}
- Description: "${question.description}"
${question.pseudoCode ? `- Expected logic/pseudocode context: \`\`\`\n${question.pseudoCode}\n\`\`\`` : ''}
${question.correctAnswer ? `- Reference Target Answer/Hint: "${question.correctAnswer}"` : ''}

User's Solution Submission:
\`\`\`
${userInput}
\`\`\`
${sandboxLogs && sandboxLogs.length > 0 ? `
User's Runtime Sandbox Console Execution Logs:
\`\`\`
${sandboxLogs.join('\n')}
\`\`\`` : ''}

Analyze the user's solution. If the question category is ABAP or Logic, check if the input demonstrates correct programming patterns, syntax logic, or dynamic algorithms matching the description. If HR, evaluate communication suitability. If execution logs are provided, analyze them for correctness, compilation safety, and efficiency. Return the graded JSON result.`;

  try {
    const rawResponse = await callGemini(prompt, systemInstruction, true);
    const parsed: AIGradeResult = JSON.parse(rawResponse.trim());
    return parsed;
  } catch (e: any) {
    console.error('[aiService] gradeAnswerWithAI error:', e);
    throw new Error(e.message || 'AI Grading failed due to network or parsing issues.');
  }
}

/**
 * Sends a chat message query to the Gemini AI Counsel with structured history.
 */
export async function queryCounselChat(history: ChatMessage[], nextMessage: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API Key missing. Enter your Gemini API key in settings.');
  }

  const systemInstruction = `You are the Neural Counsel of the Quantum Growth OS—a highly sophisticated, futuristic AI strategic coach and performance advisor.
Your primary role is to guide the user to optimize their routines, levels, habits, and career path progression.
Keep your tone highly professional, encouraging, slightly tech-sci-fi, and extremely punchy. Use short paragraphs, bullet points, and high-impact strategic terms.
Avoid fluff. Always ground advice in high-yield execution habits.
Always converse in the context of the four growth pillars: Study (learning/code), Health (movement/fitness), Finance (ledgers/wealth), and Mind (meditation/discipline).`;

  // Format history for API consumption
  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  // Direct structured payload
  const contents = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));

  // Append new user message
  contents.push({
    role: 'user',
    parts: [{ text: nextMessage }]
  });

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Neural Link Error: ${errMsg}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Neural Counsel returned an empty response.');

  return text;
}

/**
 * Generates a bespoke Strategy Report based on current user progression metadata.
 */
export async function generateStrategyReport(state: UserProgressionState): Promise<string> {
  const systemInstruction = `You are the Neural Counsel Strategy Architect. You analyze a user's strategic life data and compile a premium, futuristic "Quantum Growth Strategy Report" in Markdown format.
Focus on actionable items, analytical projections, and growth advice tailored to their specific levels.`;

  const prompt = `Construct a highly-tailored Strategy Growth Report for a user with the following profile:
- Display Name: ${state.displayName || 'Agent'}
- Strategic Archetype: ${state.archetype || 'None selected'}
- Global Progression Level: Level ${state.totalLevel || 1} (Total XP: ${state.totalXp || 0})
- Streaks: ${state.streakCount || 0} active days
- User Specified Goals: "${state.goals || 'None specified'}"

Current Pillar Levels & XP:
- 📚 Study: Level ${state.level?.Study || 1} (XP: ${state.xp?.Study || 0})
- 💪 Health: Level ${state.level?.Health || 1} (XP: ${state.xp?.Health || 0})
- 💼 Finance: Level ${state.level?.Finance || 1} (XP: ${state.xp?.Finance || 0})
- 🧘 Mind: Level ${state.level?.Mind || 1} (XP: ${state.xp?.Mind || 0})

The strategy report MUST include:
1. **🧬 Executive Neural Analysis**: Analyze their selected Archetype and Goals in relation to their current levels.
2. **📈 Pillar-by-Pillar Protocol**: Give 2 concrete, high-yield action items for each of the four pillars (Study, Health, Finance, Mind) to accelerate growth.
3. **⚠️ Bottleneck Detection**: Identify their lowest pillar level and provide a diagnostic action plan to balance the system.
Use professional, cybernetic, and highly encouraging strategist vocabulary. Format with bold headers and bullet lists.`;

  return callGemini(prompt, systemInstruction, false);
}

export interface AIOptimizedTask {
  name: string;
  start_time: string; // "HH:MM" format
  duration_minutes: number;
  pillar: 'Study' | 'Health' | 'Finance' | 'Mind';
  priority: 'Low' | 'Medium' | 'High';
}

export interface AIOptimizedScheduleResponse {
  report: string; // Markdown formatted optimization report
  tasks: AIOptimizedTask[]; // Array of optimized tasks to directly apply
}

/**
 * Analyzes and optimizes a user's daily timetable slots, returning a structured diagnostic and executable task list.
 */
export async function optimizeSchedule(tasks: any[]): Promise<AIOptimizedScheduleResponse> {
  const systemInstruction = `You are the Neural Schedule Optimizer. You evaluate a user's active routine blocks, diagnose pacing/stamina issues, and output an optimized timetable layout.
You must return ONLY a valid JSON object matching the following TypeScript interface:
interface AIOptimizedTask {
  name: string;
  start_time: string; // "HH:MM" format
  duration_minutes: number;
  pillar: 'Study' | 'Health' | 'Finance' | 'Mind';
  priority: 'Low' | 'Medium' | 'High';
}
interface AIOptimizedScheduleResponse {
  report: string; // A highly strategic Daily Schedule Optimization Report in Markdown, containing a Diagnostic, an Optimized Protocol explanation, and Recovery tips.
  tasks: AIOptimizedTask[]; // An array of the new optimized schedule tasks that we can directly program into the daily timetable. Ensure start times are sequential and logical (e.g. including 5-10 min gaps/breaks).
}
Do NOT include any markdown code blocks (like \`\`\`json) or conversational text around your JSON output. Return ONLY the raw JSON string.`;

  const formattedTasks = tasks.map((t, idx) => 
    `Block #${idx + 1}: ${t.start_time || t.start || '09:00'} | Title: "${t.name || t.title}" | Pillar: ${t.pillar || 'Unspecified'} | Priority: ${t.task_target || t.priority || 'Medium'}`
  ).join('\n');

  const prompt = `Evaluate and optimize my current daily timetable blocks:
${formattedTasks || 'No tasks scheduled yet.'}

Reconstruct these into an optimized structure with balanced breaks, deep focus pairing, and correct timeline flow. Return the structured JSON output.`;

  try {
    const rawResponse = await callGemini(prompt, systemInstruction, true);
    const parsed: AIOptimizedScheduleResponse = JSON.parse(rawResponse.trim());
    return parsed;
  } catch (e: any) {
    console.error('[aiService] optimizeSchedule error:', e);
    throw new Error(e.message || 'AI Schedule Optimization failed.');
  }
}

/**
 * Generates a dynamic CS/ABAP question using the Gemini API.
 */
export async function generateAIQuestion(category: string, difficulty: string, currentLevel: number): Promise<Question> {
  const systemInstruction = `You are the Neural Protocol Architect of the Quantum Growth OS. Your role is to generate a highly tailored, immersive sci-fi-themed computer science, system logic, or ABAP programming quest.
You must return ONLY a valid JSON object matching the following TypeScript interface:
interface Question {
  id: string;          // Must be a unique identifier starting with "ai-", e.g. "ai-abap-302"
  category: 'Pattern' | 'Logic' | 'HR' | 'ABAP';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;       // Immersive, cyberpunk-themed title (e.g. "Dynamic Memory Leak Intercept")
  description: string; // The objective of the task. Keep it highly detailed, professional, and matching the difficulty.
  logic: string;       // Precise target answer/logic expected in user answer. Keep this clean.
  hint: string;        // Sci-fi themed hint to help the user.
  xpFirstSolve: number; // XP to award. Easy = 15-20, Medium = 25-35, Hard = 40-55.
  xpRepeatSolve: number; // XP for repeats. Easy = 3-4, Medium = 5-7, Hard = 8-15.
  pseudoCode?: string; // Optional code snippet, template code, helper interface, or starting boilerplate.
  correctAnswer?: string; // Reference correct answer or exact code string.
}
Do NOT include any markdown code blocks (like \`\`\`json) or conversational text around your JSON output. Return ONLY the raw JSON string.`;

  const prompt = `Synthesize an AI practice quest matching these parameters:
- Category: ${category === 'All' || category === 'Training' ? 'ABAP' : category}
- Difficulty: ${difficulty === 'All' ? 'Medium' : difficulty}
- Target Progression Threshold: Level ${currentLevel}

Ensure the question is extremely creative, immersive (cyberpunk/sci-fi framing like "Intercepting high-latency memory packets" or "Defending defensive firewalls"), and testing actual logical concepts suited for Level ${currentLevel}. Output the raw JSON structure.`;

  try {
    const rawResponse = await callGemini(prompt, systemInstruction, true);
    const parsed: Question = JSON.parse(rawResponse.trim());
    return parsed;
  } catch (e: any) {
    console.error('[aiService] generateAIQuestion error:', e);
    throw new Error(e.message || 'AI Question Generation failed.');
  }
}

export interface AIBioMission {
  title: string;
  xpAward: number;
  timeRequired: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

/**
 * Generates bespoke bio-hacking protocols using the Gemini API.
 */
export async function generateBioMissions(archetype: string, healthLevel: number, goals: string): Promise<AIBioMission[]> {
  const systemInstruction = `You are the Cybernetic Bio-Hacking Mission Advisor in the Quantum Growth OS Lab. Your role is to generate biological optimization protocols tailored to a user's archetype and level.
You must return ONLY a valid JSON array containing exactly 3 objects matching this TypeScript interface:
interface AIBioMission {
  title: string;       // cyberpunk-themed title (e.g. "NSDR Synaptic Calming", "Mitochondrial Cold Reboot")
  xpAward: number;     // XP to award. Easy = 15-20, Medium = 25-30, Hard = 40-50.
  timeRequired: string; // e.g. "15 min", "3 min", "90 min"
  difficulty: 'Easy' | 'Medium' | 'Hard';
}
Do NOT include any markdown code blocks (like \`\`\`json) or conversational text around your JSON output. Return ONLY the raw JSON string.`;

  const prompt = `Synthesize exactly 3 daily bio-hacking optimization protocols for:
- User Archetype: ${archetype}
- Health Pillar Level: Level ${healthLevel}
- Tactical Goals: "${goals}"

Ensure the protocols are innovative, highly biological, scientifically sound (e.g., cold showers, breathwork protocols, circadian alignment, sunlight exposure, fast windows), and immersive in cyberpunk terminology. Output raw JSON list.`;

  try {
    const rawResponse = await callGemini(prompt, systemInstruction, true);
    const parsed: AIBioMission[] = JSON.parse(rawResponse.trim());
    return parsed;
  } catch (e: any) {
    console.error('[aiService] generateBioMissions error:', e);
    throw new Error(e.message || 'Bio-Mission synthesis failed.');
  }
}

/**
 * Synthesizes dynamic, personalized ascension calibration insights for the Rank & Rewards workspace.
 */
export async function generateRankCalibrationInsights(
  archetype: string,
  currentLevel: number,
  baselineOffset: number,
  goals: string
): Promise<string> {
  const systemInstruction = `You are the Neural Ascension Strategist of the Quantum Growth OS. Your role is to analyze the user's calibration profile, active rank standing, and growth velocity to compile a highly futuristic, motivating "Synaptic Ascension & Rank Strategy Dossier" in Markdown.
Keep your tone extremely premium, slightly tech-cyberpunk, and highly strategic. Limit fluff. Output brief actionable growth instructions.`;

  const prompt = `Synthesize a Synaptic Ascension & Rank Strategy Dossier for:
- Strategic Archetype: ${archetype}
- Current Active Rank Level: Level ${currentLevel}
- Selected Baseline Starting Offset: ${baselineOffset >= 0 ? '+' : ''}${baselineOffset}
- User Defined Growth Milestones: "${goals || 'None specified'}"

The strategy dossier MUST include:
1. **🧬 Synaptic Calibrator Status**: Analyze their active rank, starting offset, and raw level progress. Highlight their courage if they started from a negative baseline ("climbing out of the Void/Abyss").
2. **⚔️ High-Yield Ascension Directives**: Provide 3 distinct, high-impact tactical exercises matching their archetype to accelerate their leveling speed.
3. **🚀 Tactical System Projection**: A futuristic diagnostic prediction on how their progress will compound, concluding with a custom cyberpunk motivational mantra or quote (e.g. "Let the Neural Core align with your actions").`;

  return callGemini(prompt, systemInstruction, false);
}
