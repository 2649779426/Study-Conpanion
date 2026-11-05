"use client";

type Props = {
  minutes: number;
  onChange: (minutes: number) => void;
};

export function TaskMinutesEditor({ minutes, onChange }: Props) {
  return (
    <div
      className="task-minutes"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="减少时长"
        onClick={() => onChange(Math.max(5, minutes - 5))}
      >
        −
      </button>
      <input
        type="number"
        min={5}
        max={480}
        step={5}
        value={minutes}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="任务时长（分钟）"
      />
      <span className="muted" style={{ fontSize: 12 }}>
        分钟
      </span>
      <button
        type="button"
        aria-label="增加时长"
        onClick={() => onChange(Math.min(480, minutes + 5))}
      >
        +
      </button>
    </div>
  );
}
