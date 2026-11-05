// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";
import { StoreProvider, useAppStore } from "./StoreProvider";
import { createSeedStore, STORAGE_KEY } from "@/lib/seed";
import { DigitalHumanPlayer } from "./DigitalHumanPlayer";
import { AppShell } from "./AppShell";
import HomePage from "@/app/page";
import CheckInPage from "@/app/checkin/page";

// DOM 模拟，不启动浏览器；只替换 Next 图片渲染和外部网络/媒体接口。
vi.mock("next/image", () => ({ default: (props: { alt: string }) => <span>{props.alt}</span> }));
const navigation = vi.hoisted(() => ({ path: "/", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.path, useRouter: () => ({ push: navigation.push }) }));
let root: Root;
let host: HTMLDivElement;
let api: ReturnType<typeof useAppStore>;
function Observe() { const current = useAppStore(); useEffect(() => { api = current; }, [current]); return null; }
async function settle() {
  for (let i = 0; i < 4; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1); });
}
beforeEach(() => {
  navigation.path = "/"; navigation.push.mockClear();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-04T16:10:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (input: string) => Response.json(String(input).includes("/status") ? { configured: false } : { ok: true, job: null })));
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
it.each(["/", "/checkin"])("%s 到点只复用页内播放器，显示提醒横幅并切换对应视频", async path => {
  navigation.path = path;
  vi.setSystemTime(new Date("2026-11-05T06:00:00Z"));
  const played: string[] = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played.push(this.getAttribute("src") || ""); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  await act(async () => root.render(<StoreProvider><Observe /><AppShell>{path === "/" ? <HomePage /> : <CheckInPage />}</AppShell></StoreProvider>));
  await settle();
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelectorAll("video")).toHaveLength(1);
  expect(host.textContent).toContain("到点提醒 · 午后催学");
  const media = host.querySelector("video")!;
  expect(media.getAttribute("src")).toBe("/videos/reminder.mp4");
  expect(media.getAttribute("poster")).toBe("/videos/reminder.jpg");
  expect(media.getAttribute("preload")).toBe("auto");
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(played).toEqual(["/videos/reminder.mp4"]);
  await click("关闭");
  expect(host.textContent).not.toContain("到点提醒 · 午后催学");
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(played).toHaveLength(1);
});
it("后台紧凑提醒可去首页复用播放器，多条显示下一条并能关闭", async () => {
  navigation.path = "/admin";
  const played: string[] = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played.push(this.getAttribute("src") || ""); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  await act(async () => root.render(<StoreProvider><Observe /><AppShell><AdminPage /></AppShell></StoreProvider>));
  await settle();
  await act(async () => { api.tryRule(api.store!.rules[0]); api.tryRule(api.store!.rules[2]); });
  await settle();
  expect(host.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(host.querySelector('[role="dialog"]')?.textContent).toContain("去首页");
  expect(host.querySelector('[role="dialog"]')?.textContent).toContain("下一条(1)");
  await click("下一条(1)");
  expect(host.querySelector("video")?.getAttribute("src")).toBe("/videos/review.mp4");
  await click("去首页");
  expect(navigation.push).toHaveBeenCalledWith("/");
  navigation.path = "/";
  await act(async () => root.render(<StoreProvider><Observe /><AppShell><HomePage /></AppShell></StoreProvider>));
  await settle();
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelectorAll("video")).toHaveLength(1);
  expect(host.textContent).toContain("手动试触发 · 晚间复盘");
  expect(host.querySelector("video")?.getAttribute("src")).toBe("/videos/review.mp4");
  await click("关闭");
  expect(api.store!.broadcasts).toHaveLength(0);
});
it("首页开场自动播放尚未执行时收到提醒，取消开场计时且关闭后不重播", async () => {
  const played: string[] = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played.push(this.getAttribute("src") || ""); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  await act(async () => root.render(<StoreProvider><Observe /><AppShell><HomePage /></AppShell></StoreProvider>));
  await settle();
  await act(async () => api.tryRule(api.store!.rules[2]));
  await settle();
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(played).toEqual(["/videos/review.mp4"]);
  await click("关闭");
  await act(async () => { await vi.advanceTimersByTimeAsync(800); });
  expect(played).toHaveLength(1);
});
it("21:15 首次加载仅有两条真实已错过消息，没有提醒播放器浮窗", async () => {
  navigation.path = "/admin";
  vi.setSystemTime(new Date("2026-11-05T13:15:00Z"));
  await act(async () => root.render(<StoreProvider><Observe /><AppShell><AdminPage /></AppShell></StoreProvider>));
  await settle();
  expect(api.store!.messages).toHaveLength(2);
  expect(api.store!.messages.every(m => m.text.endsWith("已错过"))).toBe(true);
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelectorAll("video")).toHaveLength(0);
  expect(host.querySelector('[aria-label="消息"]')?.textContent).toContain("2");
  await act(async () => (host.querySelector('[aria-label="消息"]') as HTMLButtonElement).click());
  expect(host.querySelector('[aria-label="消息"]')?.textContent).not.toContain("2");
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
async function renderAdmin() {
  await act(async () => root.render(<StoreProvider><Observe /><AdminPage /></StoreProvider>));
  await settle();
}
function button(label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(b => b.textContent === label);
  if (!found) throw new Error(`missing button ${label}`);
  return found;
}
async function click(label: string) { await act(async () => button(label).click()); await settle(); }

it("保存第二条话术及启停第二条规则后保持当前选择；无凭据生成置灰", async () => {
  await renderAdmin();
  const selectScript = host.querySelectorAll("select")[0];
  await act(async () => { selectScript.value = "s-remind"; selectScript.dispatchEvent(new Event("change", { bubbles: true })); });
  await click("保存话术");
  expect(host.querySelectorAll("select")[0].value).toBe("s-remind");
  const selectRule = [...host.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "r2"))!;
  await act(async () => { selectRule.value = "r2"; selectRule.dispatchEvent(new Event("change", { bubbles: true })); });
  await click("停用");
  expect(selectRule.value).toBe("r2");
  expect(api.store!.rules.find(r => r.id === "r2")!.enabled).toBe(false);
  expect([...host.querySelectorAll("button")].filter(b => b.textContent === "生成数字人视频").every(b => b.disabled)).toBe(true);
  expect(host.textContent).toContain("未配置蝉镜凭据，见 README");
});
it("重置先显示页面内确认条，确认后才清空真实记录", async () => {
  const seed = createSeedStore(); seed.userName = "小周";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  await renderAdmin();
  await click("重置演示数据");
  expect(api.store!.userName).toBe("小周");
  expect(host.textContent).toContain("确定恢复初始演示数据");
  await click("确认重置");
  expect(api.store!.userName).toBe("同学");
  expect(api.store!.checkIns).toHaveLength(0);
});
it("调度器在后台页到点运行、写消息并入全局播报队列，后续检查不重复", async () => {
  vi.setSystemTime(new Date("2026-11-05T00:29:50Z"));
  await renderAdmin();
  expect(api.store!.broadcasts).toHaveLength(0);
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(api.store!.broadcasts[0].scene).toBe("opening");
  expect(api.store!.messages[0].text).toContain("早间开场");
  await act(async () => { await vi.advanceTimersByTimeAsync(40000); });
  expect(api.store!.broadcasts).toHaveLength(1);
  await act(async () => api.markRead("message"));
  expect(api.store!.messages.every(m => m.read)).toBe(true);
});
it("改过文案的播放器显示静态形象并朗读新文案，不播放旧视频", async () => {
  const speech = { cancel: vi.fn(), speak: vi.fn() };
  vi.stubGlobal("speechSynthesis", speech);
  vi.stubGlobal("SpeechSynthesisUtterance", class { text: string; constructor(text: string) { this.text = text; } });
  const seed = createSeedStore(); seed.scripts[0].content = "同学，今天完成新的阅读任务。";
  await act(async () => root.render(<StoreProvider><DigitalHumanPlayer scripts={seed.scripts} userName="小周" /></StoreProvider>));
  await settle();
  expect(host.querySelector("video")).toBeNull();
  expect(host.textContent).toContain("文案已更新，视频待生成");
  await click("播放 / 重播");
  expect(speech.speak.mock.calls[0][0].text).toBe("小周，今天完成新的阅读任务。");
});
it("外部复盘信号切换后只播放复盘视频，不能沿用开场视频", async () => {
  const seed = createSeedStore();
  const played: string[] = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played.push(this.getAttribute("src") || ""); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  await act(async () => root.render(<StoreProvider><DigitalHumanPlayer scripts={seed.scripts} userName="同学" /></StoreProvider>));
  await settle();
  await click("播放 / 重播");
  expect(played).toEqual(["/videos/opening.mp4"]);
  await act(async () => root.render(<StoreProvider><DigitalHumanPlayer scripts={seed.scripts} userName="同学" playSignal={{ scene: "review", token: 1 }} /></StoreProvider>));
  await settle();
  expect(played).toEqual(["/videos/opening.mp4", "/videos/review.mp4"]);
});
