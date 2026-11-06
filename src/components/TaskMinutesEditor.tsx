"use client";

import { useEffect, useState } from "react";

type Props = {
  minutes: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
};

export function TaskMinutesEditor({
  minutes,
  onChange,
  min = 5,
  max = 480,
}: Props) {
  const [value, setValue] = useState(minutes);

  useEffect(() => {
    setValue(minutes);
  }, [minutes]);

  function commit(next: number) {
    const clamped = Math.max(min, Math.min(max, Math.round(next)));
    setValue(clamped);
    onChange(clamped);
  }

  return (
    <div
      className="task-minutes-slider"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label="任务时长（分钟）"
        onChange={(e) => {
          const next = Number(e.target.value);
          setValue(next);
          onChange(next);
        }}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="task-minutes-meta">
        <span className="task-minutes-value">{value} 分钟</span>
        <button
          type="button"
          className="task-minutes-reset"
          onClick={() => commit(60)}
        >
          重置 60
        </button>
      </div>
    </div>
  );
}
