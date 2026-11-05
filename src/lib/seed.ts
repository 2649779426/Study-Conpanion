import type { AppStore, PlanTemplate, ScriptScene } from "./types";
import { todayKey } from "./date";

export const STORAGE_KEY = "kaoyan-duxue-store-v1";

function planTemplate(template: Omit<PlanTemplate, "dailyMinutes" | "subjects">): PlanTemplate {
  return { ...template, dailyMinutes: template.tasks.reduce((sum, task) => sum + task.minutes, 0),
    subjects: [...new Set(template.tasks.map(task => task.subject))] };
}

/** 仅逐字相同的旧种子参与迁移，用户编辑过的内容保持原样。 */
export const LEGACY_SCRIPT_TEXTS: Record<ScriptScene, string> = {
  opening: "同学你好，我是你的考研督学助手。今天按计划推进，先从英语阅读开始。打开任务，打卡跟上节奏，我们一起把今天拿下。",
  reminder: "提醒一下：今天该完成英语单词与阅读任务了。别拖延，完成后记得打卡。坚持住，离目标又近一步。",
  review: "今天辛苦了。回顾一下已完成的任务，未完成的拆到明天。睡前把错题看一眼，明天继续稳步推进。",
};

export function createSeedStore(): AppStore {
  const today = todayKey();

  return {
    userName: "同学",
    taskDate: today,
    focus: null,
    focusRecords: [],
    focusRemainders: {},
    triggeredRules: {},
    missedRules: {},
    messages: [],
    noticeReadKeys: [],
    videoJobs: [],
    broadcasts: [],
    plan: {
      id: "plan-demo",
      templateId: "tpl-kaoyan-30",
      name: "考研冲刺 30 天伴学计划",
      examTarget: "2026 考研 · 目标院校冲刺",
      startDate: today,
      streak: 0,
      tasks: [
        {
          id: "t1",
          title: "英语真题阅读 × 2 篇",
          baseTitle: "英语真题阅读 × 2 篇",
          baseMinutes: 60,
          subject: "英语",
          minutes: 60,
          done: false,
        },
        {
          id: "t2",
          title: "政治马原错题回顾",
          baseTitle: "政治马原错题回顾",
          baseMinutes: 40,
          subject: "政治",
          minutes: 40,
          done: false,
        },
        {
          id: "t3",
          title: "专业课核心框架默写",
          baseTitle: "专业课核心框架默写",
          baseMinutes: 50,
          subject: "专业课",
          minutes: 50,
          done: false,
        },
        {
          id: "t4",
          title: "晚间复盘与明日预告",
          baseTitle: "晚间复盘与明日预告",
          baseMinutes: 15,
          subject: "复盘",
          minutes: 15,
          done: false,
        },
      ],
    },
    scripts: [
      {
        id: "s-open",
        scene: "opening",
        title: "开场陪伴",
        content:
          "同学你好，我是你的督学学姐。今天的任务已经排好了，先从英语阅读开始。学完一项就点完成，我们一起把今天拿下。",
        updatedAt: today,
      },
      {
        id: "s-remind",
        scene: "reminder",
        title: "节点催学",
        content:
          "同学，下午两点了，政治马原错题回顾还没完成。先花四十分钟过一遍错题，做完回来打卡，学姐等你。",
        updatedAt: today,
      },
      {
        id: "s-review",
        scene: "review",
        title: "晚间复盘",
        content:
          "今天辛苦啦。打开学习成果，看看今天专注了多久。没做完的明天接着来，睡前把错题再看一眼，学姐明天继续陪你。",
        updatedAt: today,
      },
    ],
    templates: [
      planTemplate({
        id: "tpl-kaoyan-30",
        name: "考研冲刺 30 天",
        examTarget: "统考冲刺",
        tasks: [
          { title: "英语真题阅读 × 2 篇", subject: "英语", minutes: 60 },
          { title: "政治马原错题回顾", subject: "政治", minutes: 40 },
          { title: "专业课核心框架默写", subject: "专业课", minutes: 50 },
          { title: "晚间复盘与明日预告", subject: "复盘", minutes: 15 },
        ],
      }),
      planTemplate({
        id: "tpl-english-focus",
        name: "英语强化周",
        examTarget: "英语提分",
        tasks: [
          { title: "单词 100 个", subject: "英语", minutes: 30 },
          { title: "阅读理解 2 篇", subject: "英语", minutes: 40 },
          { title: "作文提纲 1 篇", subject: "英语", minutes: 30 },
          { title: "错题回看", subject: "英语", minutes: 20 },
        ],
      }),
      planTemplate({
        id: "tpl-balanced",
        name: "均衡备考周",
        examTarget: "综合稳住",
        tasks: [
          { title: "数学习题 10 题", subject: "数学", minutes: 60 },
          { title: "英语阅读 1 篇", subject: "英语", minutes: 40 },
          { title: "政治选择题一节", subject: "政治", minutes: 30 },
          { title: "专业课背诵", subject: "专业课", minutes: 50 },
        ],
      }),
    ],
    rules: [
      {
        id: "r1",
        name: "早间开场",
        time: "08:30",
        scene: "opening",
        enabled: true,
        note: "开始学习时播报开场话术",
      },
      {
        id: "r2",
        name: "午后催学",
        time: "14:00",
        scene: "reminder",
        enabled: true,
        note: "未打卡则触发节点提醒",
      },
      {
        id: "r3",
        name: "晚间复盘",
        time: "21:30",
        scene: "review",
        enabled: true,
        note: "结束学习后播报复盘总结",
      },
    ],
    checkIns: [],
  };
}
