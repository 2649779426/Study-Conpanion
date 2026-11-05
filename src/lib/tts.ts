let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, onEnd?: () => void, onError?: (reason: string) => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onError?.("当前浏览器不支持语音合成");
    return () => undefined;
  }

  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 1;
  utter.pitch = 1;
  currentUtterance = utter;
  utter.onend = () => { if (currentUtterance === utter) { currentUtterance = null; onEnd?.(); } };
  utter.onerror = (event) => { if (currentUtterance === utter) { currentUtterance = null; onError?.(event.error); } };
  try { window.speechSynthesis.speak(utter); }
  catch (error) { currentUtterance = null; onError?.(error instanceof Error ? error.message : "无法播放语音"); }

  return () => { if (currentUtterance === utter) stopSpeaking(); };
}

export function stopSpeaking() {
  currentUtterance = null;
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
}
