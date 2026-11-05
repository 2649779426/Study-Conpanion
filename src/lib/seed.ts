import type { AppStore } from "./types";

export const STORAGE_KEY = "kaoyan-duxue-store-v2";

export function createSeedStore(): AppStore {
  const today = new Date().toISOString().slice(0, 10);

  return {
    userName: "同学",
    plan: {
      id: "plan-demo",
      templateId: "tpl-kaoyan-30",
      name: "考研冲刺 30 天伴学计划",
      examTarget: "2026 考研 · 目标院校冲刺",
      startDate: today,
      streak: 3,
      tasks: [
        {
          id: "t1",
          title: "英语真题阅读 × 2 篇",
          subject: "英语",
          minutes: 60,
          done: false,
        },
        {
          id: "t2",
          title: "政治马原错题回顾",
          subject: "政治",
          minutes: 40,
          done: false,
        },
        {
          id: "t3",
          title: "专业课核心框架默写",
          subject: "专业课",
          minutes: 50,
          done: false,
        },
        {
          id: "t4",
          title: "晚间复盘与明日预告",
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
          "同学你好，我是你的考研督学学长。今天按计划推进，先从英语阅读开始。打开任务，打卡跟上节奏，我们一起把今天拿下。",
        updatedAt: today,
      },
      {
        id: "s-remind",
        scene: "reminder",
        title: "节点催学",
        content:
          "提醒一下：今天该完成英语单词与阅读任务了。别拖延，完成后记得打卡。坚持住，离目标又近一步。",
        updatedAt: today,
      },
      {
        id: "s-review",
        scene: "review",
        title: "晚间复盘",
        content:
          "今天辛苦了。回顾一下已完成的任务，未完成的拆到明天。睡前把错题看一眼，明天继续稳步推进。",
        updatedAt: today,
      },
    ],
    templates: [
      {
        id: "tpl-kaoyan-30",
        name: "考研冲刺 30 天",
        examTarget: "统考冲刺",
        dailyMinutes: 165,
        subjects: ["英语", "政治", "专业课"],
        tasks: [
          "英语真题阅读 × 2 篇",
          "政治马原错题回顾",
          "专业课核心框架默写",
          "晚间复盘与明日预告",
        ],
      },
      {
        id: "tpl-english-focus",
        name: "英语强化周",
        examTarget: "英语提分",
        dailyMinutes: 120,
        subjects: ["英语"],
        tasks: ["单词 100 个", "阅读理解 2 篇", "作文提纲 1 篇", "错题回看"],
      },
      {
        id: "tpl-balanced",
        name: "均衡备考周",
        examTarget: "综合稳住",
        dailyMinutes: 180,
        subjects: ["英语", "政治", "专业课", "数学"],
        tasks: ["数学习题 10 题", "英语阅读 1 篇", "政治选择题一节", "专业课背诵"],
      },
    ],
    rules: [
      {
        id: "r1",
        name: "早间开场",
        time: "08:30",
        scene: "opening",
        enabled: true,
        note: "开始学习时播报开场寄语",
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
