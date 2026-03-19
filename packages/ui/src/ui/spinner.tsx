"use client";

import { useEffect, useMemo, useState, type HTMLAttributes } from "react";
import { cn } from "../lib/utils";

const SPINNERS = {
  braille: {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    interval: 80,
  },
  braillewave: {
    frames: ["⠁", "⠂", "⠄", "⠂"],
    interval: 100,
  },
  orbit: {
    frames: ["◐", "◓", "◑", "◒"],
    interval: 100,
  },
  scanline: {
    frames: ["⎺", "⎻", "⎼", "⎽"],
    interval: 120,
  },
  pulse: {
    frames: ["·", "•", "●", "•"],
    interval: 180,
  },
} as const;

type SpinnerName = keyof typeof SPINNERS;

type SpinnerProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  name?: SpinnerName;
  interval?: number;
  playing?: boolean;
  ariaLabel?: string;
};

function Spinner({
  className,
  name = "braille",
  interval,
  playing = true,
  ariaLabel = "Loading",
  ...props
}: SpinnerProps) {
  const spinner = useMemo(() => SPINNERS[name], [name]);
  const frameInterval = interval ?? spinner.interval;
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [name]);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % spinner.frames.length);
    }, frameInterval);

    return () => window.clearInterval(timer);
  }, [playing, frameInterval, spinner.frames.length]);

  return (
    <span
      aria-label={ariaLabel}
      aria-live="polite"
      role="status"
      className={cn(
        "inline-flex select-none items-center justify-center font-mono leading-none tabular-nums",
        className,
      )}
      {...props}
    >
      {spinner.frames[frameIndex]}
    </span>
  );
}

export { Spinner, type SpinnerName };
