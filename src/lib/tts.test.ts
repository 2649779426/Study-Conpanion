// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { speakText, stopSpeaking } from "./tts";
afterEach(() => { stopSpeaking(); vi.unstubAllGlobals(); });
it("语音出错要报告失败，主动停止不能误报播放完成", () => {
  let utter: SpeechSynthesisUtterance;
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: (value: SpeechSynthesisUtterance) => { utter = value; } });
  const ended = vi.fn(); const failed = vi.fn();
  speakText("新的文案", ended, failed);
  utter!.onerror!({ error: "not-allowed" } as SpeechSynthesisErrorEvent);
  expect(failed).toHaveBeenCalledWith("not-allowed");
  expect(ended).not.toHaveBeenCalled();
  speakText("另一条", ended, failed);
  stopSpeaking();
  utter!.onend!({} as SpeechSynthesisEvent);
  expect(ended).not.toHaveBeenCalled();
});
