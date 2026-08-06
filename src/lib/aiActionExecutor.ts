import { getGeminiApiKey } from './aiService';
import { supabase } from './supabaseClient';
import type { Pillar } from '../hooks/useProgression';
import toast from 'react-hot-toast';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export type AIActionType = 
  | 'ADD_TIMETABLE_TASKS'
  | 'ADD_PRACTICE_QUESTION'
  | 'LOG_FINANCIAL_INVESTMENT'
  | 'ADD_TODOS'
  | 'TOGGLE_TASK_COMPLETION'
  | 'UPDATE_PROFILE_SETTINGS'
  | 'GENERATE_SCHEDULE'
  | 'GENERAL_ANSWER';

export interface AITimetableTaskPayload {
  name: string;
  start_time: string; // "HH:MM"
  duration_minutes: number;
  pillar: Pillar;
  task_target: 'High' | 'Medium' | 'Low';
  day_of_week?: number;
}

export interface AIPracticeQuestionPayload {
  category: 'ABAP' | 'Pattern' | 'Logic' | 'HR';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;
  description: string;
  logic: string;
  hint: string;
  xpFirstSolve: number;
  correctAnswer?: string;
  pseudoCode?: string;
}

export interface AIFinancialInvestmentPayload {
  title: string;
  amount: number;
  pillar: Pillar;
  type: 'course' | 'tool' | 'health' | 'asset';
}

export interface AITodoPayload {
  text: string;
  pillar?: Pillar;
  priority?: 'High' | 'Medium' | 'Low';
}

export interface AISettingsPayload {
  theme?: string;
  goals?: string[];
  archetype?: string;
  baselineLevel?: number;
}

export interface AIExecutionResult {
  actionType: AIActionType;
  message: string;
  timetableTasks?: AITimetableTaskPayload[];
  practiceQuestion?: AIPracticeQuestionPayload;
  investment?: AIFinancialInvestmentPayload;
  todos?: AITodoPayload[];
  settings?: AISettingsPayload;
}

/**
 * Uses Gemini to parse a natural language command into structured execution payloads.
 */
export async function parseAICommand(
  userPrompt: string,
  telemetryContext?: any
): Promise<AIExecutionResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API Key missing. Enter your Gemini API key in settings or Header AI modal.');
  }

  const systemInstruction = `You are the Autonomous AI Action Engine of the Quantum Growth OS.
Your job is to parse natural language user commands (text or voice transcripts) and generate structured execution payloads that directly automate actions in the app.

Supported Action Types:
1. 'ADD_TIMETABLE_TASKS': Use when user asks to schedule tasks, routines, gym, study blocks, meetings, etc.
2. 'ADD_PRACTICE_QUESTION': Use when user asks to create or generate a practice question, coding challenge, or quest.
3. 'LOG_FINANCIAL_INVESTMENT': Use when user mentions spending money on learning, courses, tools, fitness, or financial investments.
4. 'ADD_TODOS': Use when user asks to create a todo, checklist item, or protocol objective.
5. 'UPDATE_PROFILE_SETTINGS': Use when user asks to change theme (emerald, purple, gold, quantum), set goals, change archetype, or adjust level baseline.
6. 'GENERATE_SCHEDULE': Use when user asks to auto-schedule their day or create a full routine.
7. 'GENERAL_ANSWER': Use for general questions, advice, or status queries.

You MUST return ONLY a valid JSON object matching this TypeScript interface:
interface AIExecutionResult {
  actionType: 'ADD_TIMETABLE_TASKS' | 'ADD_PRACTICE_QUESTION' | 'LOG_FINANCIAL_INVESTMENT' | 'ADD_TODOS' | 'UPDATE_PROFILE_SETTINGS' | 'GENERATE_SCHEDULE' | 'GENERAL_ANSWER';
  message: string; // A punchy 1-2 sentence confirmation or advice message in Markdown.
  timetableTasks?: Array<{ name: string; start_time: string; duration_minutes: number; pillar: 'Study'|'Health'|'Finance'|'Mind'; task_target: 'High'|'Medium'|'Low'; day_of_week?: number; }>;
  practiceQuestion?: { category: 'ABAP'|'Pattern'|'Logic'|'HR'; difficulty: 'Easy'|'Medium'|'Hard'; title: string; description: string; logic: string; hint: string; xpFirstSolve: number; correctAnswer?: string; pseudoCode?: string; };
  investment?: { title: string; amount: number; pillar: 'Study'|'Health'|'Finance'|'Mind'; type: 'course'|'tool'|'health'|'asset'; };
  todos?: Array<{ text: string; pillar?: 'Study'|'Health'|'Finance'|'Mind'; priority?: 'High'|'Medium'|'Low'; }>;
  settings?: { theme?: string; goals?: string[]; archetype?: string; baselineLevel?: number; };
}

Do NOT include markdown blocks (\`\`\`json). Return raw JSON string ONLY.`;

  const prompt = `User Command Instruction: "${userPrompt}"

Active User Telemetry Context:
${telemetryContext ? JSON.stringify(telemetryContext) : 'Standard Agent Context'}

Parse this request and construct the exact JSON execution payload.`;

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini Command Link failed with status ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('AI Engine returned an empty payload.');

  try {
    return JSON.parse(rawText.trim());
  } catch (e) {
    console.error('Failed parsing AI command payload:', rawText);
    throw new Error('AI action payload parsing failed.');
  }
}

/**
 * Executes an AIExecutionResult by applying mutations directly into the app state & database.
 */
export async function executeAIResult(
  result: AIExecutionResult,
  helpers: {
    userId: string;
    updateProfile: (updates: any) => Promise<void>;
    setTheme: (theme: string) => void;
    addXp: (pillar: Pillar, label: string, amount: number) => Promise<number>;
    reloadTimetable?: () => void;
  }
): Promise<string> {
  const { userId, updateProfile, setTheme, addXp } = helpers;
  const todayDow = new Date().getDay();
  let executedDetails: string[] = [];

  // 1. Timetable Tasks
  if (result.timetableTasks && result.timetableTasks.length > 0) {
    const tasksToAdd = result.timetableTasks.map((t, idx) => ({
      user_id: userId,
      name: t.name,
      start_time: t.start_time || '09:00',
      duration_minutes: t.duration_minutes || 45,
      pillar: t.pillar || 'Study',
      category: (t.pillar === 'Health' ? 'gym' : t.pillar === 'Study' ? 'study' : t.pillar === 'Finance' ? 'work' : 'mind') as any,
      task_target: t.task_target || 'Medium',
      day_of_week: t.day_of_week !== undefined ? t.day_of_week : todayDow,
      is_weekend: todayDow === 0 || todayDow === 6,
      order_index: idx
    }));

    if (supabase && userId !== 'default') {
      const { error } = await supabase.from('timetable_tasks').insert(tasksToAdd);
      if (error) console.error('Supabase timetable insert error:', error);
    }

    // Save to local storage cache
    const existing = JSON.parse(localStorage.getItem(`quantum_timetable_${userId}`) || '[]');
    const merged = [...existing, ...tasksToAdd];
    localStorage.setItem(`quantum_timetable_${userId}`, JSON.stringify(merged));

    executedDetails.push(`Programmed ${tasksToAdd.length} timetable task(s)`);
    if (helpers.reloadTimetable) helpers.reloadTimetable();
  }

  // 2. Practice Question
  if (result.practiceQuestion) {
    const q = result.practiceQuestion;
    const newQuestion = {
      id: `ai-${Date.now()}`,
      category: q.category || 'ABAP',
      difficulty: q.difficulty || 'Medium',
      title: q.title,
      description: q.description,
      logic: q.logic || q.correctAnswer || '',
      hint: q.hint || 'Analyze step-by-step logic.',
      xpFirstSolve: q.xpFirstSolve || 30,
      xpRepeatSolve: 10,
      pseudoCode: q.pseudoCode || '',
      correctAnswer: q.correctAnswer || ''
    };

    const existingQs = JSON.parse(localStorage.getItem(`quantum_custom_questions_${userId}`) || '[]');
    localStorage.setItem(`quantum_custom_questions_${userId}`, JSON.stringify([newQuestion, ...existingQs]));
    executedDetails.push(`Synthesized practice quest: "${q.title}"`);
  }

  // 3. Financial Investment Ledger
  if (result.investment) {
    const inv = result.investment;
    const logItem = {
      id: `inv-${Date.now()}`,
      title: inv.title,
      amount: inv.amount,
      pillar: inv.pillar || 'Finance',
      type: inv.type || 'course',
      date: new Date().toISOString().split('T')[0]
    };

    const existingInvs = JSON.parse(localStorage.getItem(`quantum_investments_${userId}`) || '[]');
    localStorage.setItem(`quantum_investments_${userId}`, JSON.stringify([logItem, ...existingInvs]));
    await addXp(inv.pillar || 'Finance', `AI Logged Investment: ${inv.title}`, Math.min(50, Math.round(inv.amount / 100)));
    executedDetails.push(`Logged ₹${inv.amount} investment into Vault: "${inv.title}"`);
  }

  // 4. Todos / Objectives
  if (result.todos && result.todos.length > 0) {
    const newTodos = result.todos.map(t => ({
      id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: t.text,
      pillar: t.pillar || 'Mind',
      completed: false,
      priority: t.priority || 'Medium',
      date: new Date().toISOString().split('T')[0]
    }));

    const existingTodos = JSON.parse(localStorage.getItem(`quantum_todos_${userId}`) || '[]');
    const mergedTodos = [...existingTodos, ...newTodos];
    localStorage.setItem(`quantum_todos_${userId}`, JSON.stringify(mergedTodos));

    await updateProfile({
      settings: {
        todos: mergedTodos
      }
    });

    executedDetails.push(`Added ${newTodos.length} objective todo(s)`);
  }

  // 5. Settings & Theme
  if (result.settings) {
    const s = result.settings;
    if (s.theme) {
      setTheme(s.theme);
      executedDetails.push(`Theme updated to: ${s.theme}`);
    }
    if (s.goals || s.archetype || s.baselineLevel !== undefined) {
      await updateProfile({
        ...(s.goals ? { goals: s.goals } : {}),
        ...(s.archetype ? { archetype: s.archetype } : {}),
        settings: s.baselineLevel !== undefined ? { baselineLevel: s.baselineLevel } : {}
      });
      executedDetails.push(`Profile telemetry updated`);
    }
  }

  const summaryMsg = executedDetails.length > 0 
    ? `⚡ AI Executed: ${executedDetails.join(' | ')}`
    : result.message;

  toast.success(summaryMsg, { duration: 5000, icon: '🤖' });
  return summaryMsg;
}
