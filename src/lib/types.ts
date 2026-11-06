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
  /** 本次打卡对应的已完成任务总分钟数 */
  minutes: number;
  note: string;
  createdAt: string;
};

export type AppStore = {
  userName: string;
  /** 考研考试日 YYYY-MM-DD */
  examDate: string;
  plan: StudyPlan | null;
  scripts: ScriptItem[];
  templates: PlanTemplate[];
  rules: ReminderRule[];
  checkIns: CheckInRecord[];
  lastBroadcastAt?: string;
  /** 最近一次打开应用 ISO 时间 */
  lastVisitAt?: string;
  /** 是否开启短信催学 */
  smsReminderEnabled: boolean;
  /** 每日催学时间 HH:mm（北京时间） */
  smsReminderTime: string;
  /** 最近一次短信催学日期 YYYY-MM-DD */
  smsLastSentDate?: string;
};
