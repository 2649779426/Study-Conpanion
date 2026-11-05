export type ScriptScene = "opening" | "reminder" | "review";

export type ScriptItem = {
  id: string;
  scene: ScriptScene;
  title: string;
  content: string;
  updatedAt: string;
};

export type PlanTemplate = {
  id: string;
  name: string;
  examTarget: string;
  dailyMinutes: number;
  subjects: string[];
  tasks: string[];
};

export type ReminderRule = {
  id: string;
  name: string;
  time: string;
  scene: ScriptScene;
  enabled: boolean;
  note: string;
};

export type StudyTask = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
  baseTitle: string;
  baseMinutes: number;
};

export type StudyPlan = {
  id: string;
  templateId: string;
  name: string;
  examTarget: string;
  startDate: string;
  streak: number;
  tasks: StudyTask[];
};

export type CheckInRecord = {
  id: string;
  date: string;
  taskIds: string[];
  note: string;
  createdAt: string;
  totalTasks: number;
  allDone: boolean;
};

export type AppMessage = {
  id: string;
  text: string;
  createdAt: string;
  read: boolean;
};

export type BroadcastEvent = { id: string; scene: ScriptScene; title: string };

export type VideoJob = {
  jobId: string;
  hash: string;
  scene: ScriptScene;
  text: string;
  status: "queued" | "audio" | "video" | "completed" | "failed";
  error?: string;
  url?: string;
  detail?: string;
  createdAt: string;
};

export type AppStore = {
  userName: string;
  plan: StudyPlan | null;
  scripts: ScriptItem[];
  templates: PlanTemplate[];
  rules: ReminderRule[];
  checkIns: CheckInRecord[];
  taskDate: string;
  triggeredRules: Record<string, string>;
  messages: AppMessage[];
  noticeReadKeys: string[];
  videoJobs: VideoJob[];
  broadcasts: BroadcastEvent[];
  lastBroadcastAt?: string;
};
