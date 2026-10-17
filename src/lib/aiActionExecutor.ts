import { getGeminiApiKey } from './aiService';
import { supabase } from './supabaseClient';
import type { Pillar } from '../hooks/useProgression';
import toast from 'react-hot-toast';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export type AIActionType = 
  | 'ADD_TIMETABLE_TASKS'
  | 'CLEAR_TIMETABLE_TASKS'
  | 'DELETE_TIMETABLE_TASK'
  | 'GENERATE_SCHEDULE'
  | 'ADD_TODOS'
  | 'COMPLETE_TODO'
  | 'DELETE_TODO'
  | 'MANAGE_HABITS'
  | 'COMPLETE_HABIT'
  | 'SET_WEIGHT_GOAL'
  | 'LOG_BODY_WEIGHT'
  | 'LOG_FINANCIAL_INVESTMENT'
  | 'ADD_PRACTICE_QUESTION'
  | 'UPDATE_PROFILE_SETTINGS'
  | 'NAVIGATE_VIEW'
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
  title: string;
  text?: string;
  pillar?: Pillar;
  priority?: 'High' | 'Medium' | 'Low';
  day_of_week?: number;
  time?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'one-off';
}

export interface AIHabitPayload {
  action: 'add' | 'remove';
  title: string;
  icon?: string;
}

export interface AISettingsPayload {
  theme?: string;
  displayName?: string;
  goals?: string[];
  archetype?: string;
  baselineLevel?: number;
}

export interface AIExecutionResult {
  actionType: AIActionType;
  message: string;
  timetableTasks?: AITimetableTaskPayload[];
  clearTimetable?: { day_of_week?: number | 'all' };
  deleteTimetableTask?: { task_name: string; day_of_week?: number };
  todos?: AITodoPayload[];
  completeTodo?: { todo_title: string };
  deleteTodo?: { todo_title: string };
  habits?: AIHabitPayload[];
  completeHabit?: { habit_title: string };
  weightGoal?: number | string;
  logWeight?: number;
  investment?: AIFinancialInvestmentPayload;
  practiceQuestion?: AIPracticeQuestionPayload;
  settings?: AISettingsPayload;
  navigationView?: 'dashboard' | 'practice' | 'engagement' | 'vault' | 'rank' | 'strategic_control';
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
    throw new Error('API Key missing. Enter your Gemini API key in Settings or AI Modal.');
  }

  const systemInstruction = `You are the Autonomous AI Operating System Engine of the Quantum Growth OS.
Your job is to parse natural language user commands (text or voice transcripts) and generate structured execution payloads that directly automate actions across the entire app.

Supported Action Capabilities:
1. 'ADD_TIMETABLE_TASKS': Schedule blocks, deep work, gym, study, meditation (name, start_time "HH:MM", duration_minutes, pillar 'Study'|'Health'|'Finance'|'Mind', task_target 'High'|'Medium'|'Low', day_of_week 0=Sun..6=Sat).
2. 'CLEAR_TIMETABLE_TASKS': Clear/wipe today's or all scheduled execution blocks.
3. 'DELETE_TIMETABLE_TASK': Delete a specific execution block by name/title.
4. 'GENERATE_SCHEDULE': Auto-generate a complete balanced daily schedule.
5. 'ADD_TODOS': Schedule daily, weekly, or one-off tasks into the Protocol Deck (title, pillar, priority, day_of_week, time "HH:MM", recurrence 'daily'|'weekly'|'monthly'|'one-off').
6. 'COMPLETE_TODO': Mark a todo as completed and award XP.
7. 'DELETE_TODO': Remove a todo from the deck.
8. 'MANAGE_HABITS': Add a new habit or remove a habit from Vitality Parameters.
9. 'COMPLETE_HABIT': Check off a habit for today.
10. 'SET_WEIGHT_GOAL': Set target weight in kg (e.g. 70, 72.5).
11. 'LOG_BODY_WEIGHT': Log today's weight measurement in kg.
12. 'LOG_FINANCIAL_INVESTMENT': Log an investment or education expense into Vault.
13. 'ADD_PRACTICE_QUESTION': Create an interactive coding challenge for The Arena.
14. 'UPDATE_PROFILE_SETTINGS': Change theme ('emerald','purple','gold','quantum','rose','amber','cyan','orange','indigo'), change display name, set/add/remove goals, change archetype ('Technical Elite','Wealth Architect','Vitality Vanguard'), or adjust baseline.
15. 'NAVIGATE_VIEW': Navigate to 'dashboard'|'practice'|'engagement'|'vault'|'rank'|'strategic_control'.
16. 'GENERAL_ANSWER': Provide strategic advice, analysis, or status feedback.

You can populate multiple payload fields if the user asks for multiple things at once!

You MUST return ONLY a valid JSON object matching this TypeScript interface:
interface AIExecutionResult {
  actionType: string;
  message: string; // Punchy 1-2 sentence confirmation or advice message in Markdown.
  timetableTasks?: Array<{ name: string; start_time: string; duration_minutes: number; pillar: 'Study'|'Health'|'Finance'|'Mind'; task_target: 'High'|'Medium'|'Low'; day_of_week?: number; }>;
  clearTimetable?: { day_of_week?: number | 'all'; };
  deleteTimetableTask?: { task_name: string; day_of_week?: number; };
  todos?: Array<{ title: string; pillar?: 'Study'|'Health'|'Finance'|'Mind'; priority?: 'High'|'Medium'|'Low'; day_of_week?: number; time?: string; recurrence?: 'daily'|'weekly'|'monthly'|'one-off'; }>;
  completeTodo?: { todo_title: string; };
  deleteTodo?: { todo_title: string; };
  habits?: Array<{ action: 'add'|'remove'; title: string; icon?: string; }>;
  completeHabit?: { habit_title: string; };
  weightGoal?: number | string;
  logWeight?: number;
  investment?: { title: string; amount: number; pillar: 'Study'|'Health'|'Finance'|'Mind'; type: 'course'|'tool'|'health'|'asset'; };
  practiceQuestion?: { category: 'ABAP'|'Pattern'|'Logic'|'HR'; difficulty: 'Easy'|'Medium'|'Hard'; title: string; description: string; logic: string; hint: string; xpFirstSolve: number; correctAnswer?: string; pseudoCode?: string; };
  settings?: { theme?: string; displayName?: string; goals?: string[]; archetype?: string; baselineLevel?: number; };
  navigationView?: 'dashboard'|'practice'|'engagement'|'vault'|'rank'|'strategic_control';
}

Do NOT include markdown block syntax (\`\`\`json). Return raw JSON string ONLY.`;

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
    onNavigate?: (view: string) => void;
  }
): Promise<string> {
  const { userId, updateProfile, setTheme, addXp } = helpers;
  const todayDow = new Date().getDay();
  const todayStr = new Date().toISOString().split('T')[0];
  const executedDetails: string[] = [];

  // 1. Navigation Action
  if (result.navigationView) {
    const view = result.navigationView;
    if (helpers.onNavigate) helpers.onNavigate(view);
    window.dispatchEvent(new CustomEvent('quantum_navigate', { detail: view }));
    executedDetails.push(`Navigated to ${view.replace('_', ' ').toUpperCase()}`);
  }

  // 2. Clear Timetable Tasks
  if (result.clearTimetable) {
    const targetDay = result.clearTimetable.day_of_week;
    const existing = JSON.parse(localStorage.getItem(`quantum_timetable_${userId}`) || '[]');
    let updated = existing;
    if (targetDay === 'all') {
      updated = [];
      executedDetails.push('Cleared entire timetable schedule');
    } else {
      const dayNum = targetDay !== undefined ? targetDay : todayDow;
      updated = existing.filter((t: any) => t.day_of_week !== dayNum && t.dayOfWeek !== dayNum);
      executedDetails.push(`Cleared timetable for day ${dayNum}`);
    }
    localStorage.setItem(`quantum_timetable_${userId}`, JSON.stringify(updated));
    localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
  }

  // 3. Delete Specific Timetable Task
  if (result.deleteTimetableTask && result.deleteTimetableTask.task_name) {
    const nameMatch = result.deleteTimetableTask.task_name.toLowerCase();
    const existing = JSON.parse(localStorage.getItem(`quantum_timetable_${userId}`) || '[]');
    const updated = existing.filter((t: any) => {
      const title = (t.name || t.title || '').toLowerCase();
      return !title.includes(nameMatch);
    });
    localStorage.setItem(`quantum_timetable_${userId}`, JSON.stringify(updated));
    localStorage.setItem(`quantum_timetable_default`, JSON.stringify(updated));
    executedDetails.push(`Removed timetable block: "${result.deleteTimetableTask.task_name}"`);
  }

  // 4. Add Timetable Tasks
  if (result.timetableTasks && result.timetableTasks.length > 0) {
    const tasksToAdd = result.timetableTasks.map((t, idx) => ({
      id: Date.now() + idx,
      user_id: userId,
      name: t.name,
      title: t.name,
      start: t.start_time || '09:00',
      end: (() => {
        try {
          const [h, m] = (t.start_time || '09:00').split(':').map(Number);
          const dur = t.duration_minutes || 45;
          const totalMin = h * 60 + m + dur;
          const endH = Math.floor(totalMin / 60) % 24;
          const endM = totalMin % 60;
          return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        } catch {
          return '09:45';
        }
      })(),
      start_time: t.start_time || '09:00',
      duration_minutes: t.duration_minutes || 45,
      pillar: t.pillar || 'Study',
      category: (t.pillar === 'Health' ? 'gym' : t.pillar === 'Study' ? 'study' : t.pillar === 'Finance' ? 'work' : 'mind') as any,
      task_target: t.task_target || 'Medium',
      day_of_week: t.day_of_week !== undefined ? t.day_of_week : todayDow,
      dayOfWeek: t.day_of_week !== undefined ? t.day_of_week : todayDow,
      is_weekend: todayDow === 0 || todayDow === 6,
      isWeekend: todayDow === 0 || todayDow === 6,
      order_index: idx
    }));

    if (supabase && userId !== 'default') {
      supabase.from('timetable_tasks').insert(tasksToAdd).then(({ error }) => {
        if (error) console.error('Supabase timetable insert error:', error);
      });
    }

    const existing = JSON.parse(localStorage.getItem(`quantum_timetable_${userId}`) || '[]');
    const merged = [...existing, ...tasksToAdd];
    localStorage.setItem(`quantum_timetable_${userId}`, JSON.stringify(merged));
    localStorage.setItem(`quantum_timetable_default`, JSON.stringify(merged));

    executedDetails.push(`Programmed ${tasksToAdd.length} timetable task(s)`);
  }

  // 5. Add Protocol Deck Todos
  if (result.todos && result.todos.length > 0) {
    const existingTodos = JSON.parse(localStorage.getItem(`quantum_todos_${userId}`) || '[]');
    const newTodos = result.todos.map((t, idx) => ({
      id: Date.now() + idx,
      title: t.title || t.text || 'Protocol Todo',
      pillar: (t.pillar || 'Mind') as Pillar,
      dayOfWeek: t.day_of_week !== undefined ? t.day_of_week : todayDow,
      time: t.time || '',
      task_target: (t.priority || 'Medium') as 'High' | 'Medium' | 'Low',
      recurrence: t.recurrence || 'one-off',
      isOneOff: (t.recurrence || 'one-off') === 'one-off',
      completed: false,
      completedDates: [],
      xpAwarded: false,
      xpAwardedDates: []
    }));

    const mergedTodos = [...existingTodos, ...newTodos];
    localStorage.setItem(`quantum_todos_${userId}`, JSON.stringify(mergedTodos));
    localStorage.setItem(`quantum_todos_default`, JSON.stringify(mergedTodos));

    if (supabase && userId !== 'default') {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', userId).single();
        const cur = data?.settings || {};
        await supabase.from('profiles').update({ settings: { ...cur, todos: mergedTodos } }).eq('id', userId);
      } catch (err) {
        console.warn('Todo DB sync error:', err);
      }
    }

    executedDetails.push(`Scheduled ${newTodos.length} protocol todo(s)`);
  }

  // 6. Complete Todo
  if (result.completeTodo && result.completeTodo.todo_title) {
    const match = result.completeTodo.todo_title.toLowerCase();
    const existingTodos = JSON.parse(localStorage.getItem(`quantum_todos_${userId}`) || '[]');
    let found = false;
    let awardedXpAmount = 60;
    const updated = existingTodos.map((todo: any) => {
      if ((todo.title || todo.text || '').toLowerCase().includes(match)) {
        found = true;
        const compDates = Array.from(new Set([...(todo.completedDates || []), todayStr]));
        awardedXpAmount = todo.task_target === 'High' ? 100 : todo.task_target === 'Low' ? 40 : 60;
        return { ...todo, completed: true, completedDates: compDates };
      }
      return todo;
    });

    if (found) {
      localStorage.setItem(`quantum_todos_${userId}`, JSON.stringify(updated));
      localStorage.setItem(`quantum_todos_default`, JSON.stringify(updated));
      await addXp('Mind', `AI Completed Todo: ${result.completeTodo.todo_title}`, awardedXpAmount);
      executedDetails.push(`Checked off todo: "${result.completeTodo.todo_title}" (+${awardedXpAmount} XP)`);
    }
  }

  // 7. Delete Todo
  if (result.deleteTodo && result.deleteTodo.todo_title) {
    const match = result.deleteTodo.todo_title.toLowerCase();
    const existingTodos = JSON.parse(localStorage.getItem(`quantum_todos_${userId}`) || '[]');
    const updated = existingTodos.filter((todo: any) => !(todo.title || todo.text || '').toLowerCase().includes(match));
    localStorage.setItem(`quantum_todos_${userId}`, JSON.stringify(updated));
    localStorage.setItem(`quantum_todos_default`, JSON.stringify(updated));
    executedDetails.push(`Deleted todo matching: "${result.deleteTodo.todo_title}"`);
  }

  // 8. Manage Habits (Add / Remove)
  if (result.habits && result.habits.length > 0) {
    const existingHabits = JSON.parse(localStorage.getItem(`quantum_habits_${userId}`) || '[]');
    let updatedHabits = [...existingHabits];

    result.habits.forEach((h, idx) => {
      if (h.action === 'add') {
        const newHabit = {
          id: Date.now() + idx,
          title: h.title,
          icon: h.icon || 'Check'
        };
        updatedHabits.push(newHabit);
        executedDetails.push(`Added habit: "${h.title}"`);
      } else if (h.action === 'remove') {
        const match = h.title.toLowerCase();
        updatedHabits = updatedHabits.filter((item: any) => !(item.title || '').toLowerCase().includes(match));
        executedDetails.push(`Removed habit: "${h.title}"`);
      }
    });

    localStorage.setItem(`quantum_habits_${userId}`, JSON.stringify(updatedHabits));
    if (supabase && userId !== 'default') {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', userId).single();
        const cur = data?.settings || {};
        await supabase.from('profiles').update({ settings: { ...cur, habits: updatedHabits } }).eq('id', userId);
      } catch (err) {
        console.warn('Habit DB sync error:', err);
      }
    }
  }

  // 9. Complete Habit
  if (result.completeHabit && result.completeHabit.habit_title) {
    const hTitle = result.completeHabit.habit_title;
    await addXp('Health', `Habit check-in: ${hTitle}`, 25);
    executedDetails.push(`Logged habit completion: "${hTitle}" (+25 XP)`);
  }

  // 10. Target Weight Goal
  if (result.weightGoal !== undefined) {
    const wStr = String(result.weightGoal);
    localStorage.setItem(`quantum_weight_goal_${userId}`, wStr);
    if (supabase && userId !== 'default') {
      try {
        const { data } = await supabase.from('profiles').select('settings').eq('id', userId).single();
        const cur = data?.settings || {};
        await supabase.from('profiles').update({ settings: { ...cur, weightGoal: wStr } }).eq('id', userId);
      } catch (err) {}
    }
    executedDetails.push(`Target weight set to ${wStr} kg`);
  }

  // 11. Log Body Weight
  if (result.logWeight !== undefined) {
    const wVal = Number(result.logWeight);
    const existingBio = JSON.parse(localStorage.getItem(`quantum_pulse_bio_${userId}_${todayStr}`) || '{}');
    const updatedBio = { ...existingBio, weightKg: wVal };
    localStorage.setItem(`quantum_pulse_bio_${userId}_${todayStr}`, JSON.stringify(updatedBio));
    await addXp('Health', `Weight measurement: ${wVal}kg`, 15);
    executedDetails.push(`Logged body weight: ${wVal} kg (+15 Health XP)`);
  }

  // 12. Financial Investment Ledger
  if (result.investment) {
    const inv = result.investment;
    const logItem = {
      id: `inv-${Date.now()}`,
      title: inv.title,
      amount: inv.amount,
      pillar: inv.pillar || 'Finance',
      type: inv.type || 'course',
      date: todayStr
    };

    const existingInvs = JSON.parse(localStorage.getItem(`quantum_investments_${userId}`) || '[]');
    localStorage.setItem(`quantum_investments_${userId}`, JSON.stringify([logItem, ...existingInvs]));
    const earnedXp = Math.min(50, Math.max(10, Math.round(inv.amount / 100)));
    await addXp(inv.pillar || 'Finance', `Logged Investment: ${inv.title}`, earnedXp);
    executedDetails.push(`Logged ₹${inv.amount} into Vault: "${inv.title}" (+${earnedXp} XP)`);
    window.dispatchEvent(new CustomEvent('quantum_investments_updated'));
  }

  // 13. Practice Quest
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

  // 14. Settings & Identity
  if (result.settings) {
    const s = result.settings;
    if (s.theme) {
      setTheme(s.theme);
      executedDetails.push(`Theme matrix set to: ${s.theme}`);
    }
    if (s.displayName) {
      await updateProfile({ display_name: s.displayName });
      executedDetails.push(`Operator name updated to: "${s.displayName}"`);
    }
    if (s.goals && s.goals.length > 0) {
      await updateProfile({ goals: s.goals });
      executedDetails.push(`Updated ${s.goals.length} strategic objective(s)`);
    }
    if (s.archetype) {
      await updateProfile({ archetype: s.archetype });
      executedDetails.push(`Archetype calibrated to: ${s.archetype}`);
    }
    if (s.baselineLevel !== undefined) {
      await updateProfile({ settings: { baselineLevel: s.baselineLevel } });
      executedDetails.push(`Baseline calibrated to: ${s.baselineLevel}`);
    }
  }

  // Trigger reactive update across all open components
  window.dispatchEvent(new CustomEvent('quantum_config_updated'));
  window.dispatchEvent(new CustomEvent('quantum_timetable_updated'));
  window.dispatchEvent(new CustomEvent('quantum_todos_updated'));
  window.dispatchEvent(new CustomEvent('quantum_habits_updated'));

  if (helpers.reloadTimetable) {
    helpers.reloadTimetable();
  }

  const summaryMsg = executedDetails.length > 0 
    ? `⚡ AI Executed: ${executedDetails.join(' • ')}`
    : result.message;

  toast.success(summaryMsg, { duration: 5500, icon: '🤖' });
  return summaryMsg;
}
