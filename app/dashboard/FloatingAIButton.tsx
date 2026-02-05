"use client";

import { StudyHelpChat } from "./StudyHelpChat";

export function FloatingAIButton({ show }: { show: boolean }) {
  if (!show) return null;
  return <StudyHelpChat variant="inline" />;
}
