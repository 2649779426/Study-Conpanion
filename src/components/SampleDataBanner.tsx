"use client";
import { useAppStore } from "./StoreProvider";
import { hasSampleRecords } from "@/lib/samples";

export function SampleDataBanner() {
  const { store, clearSamples } = useAppStore();
  if (!store || !hasSampleRecords(store)) return null;
  return <div className="sample-banner" role="status">
    <div><strong>含示例数据</strong><span> 当前统计包含演示用学习记录，不能作为真实学习成果。</span></div>
    <button type="button" className="btn ghost" onClick={clearSamples}>清除示例数据</button>
  </div>;
}
