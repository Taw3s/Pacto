import { BookOpen, GraduationCap, Hammer, Keyboard, type LucideIcon } from "lucide-react";
import type { Goal } from "./types";

export const GOAL_ICON: Record<Goal, LucideIcon> = {
  study: GraduationCap,
  typing: Keyboard,
  reading: BookOpen,
  project: Hammer,
};

import type { SpriteName } from "@/components/Sprite";

/** Low-poly prop that represents each goal. */
export const GOAL_SPRITE: Record<Goal, SpriteName> = {
  study: "notebook",
  typing: "keyboard",
  reading: "openBook",
  project: "computer",
};
