/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import type { CollectibleId } from "@/lib/collectibles";

export type SpriteName =
  | "notebook"
  | "keyboard"
  | "openBook"
  | "notebookPending"
  | "notebookDone"
  | "bookPending"
  | "bookDone"
  | "computer"
  | "beachChair"
  | "sodaCan"
  | "coxinha"
  | "coffeeCup"
  | "chocolateBar"
  | "acaiBowl"
  | "pizzaSlice"
  | "iceCream"
  | "pixCoin"
  | "gavel"
  | "gavelMid"
  | "gavelUp"
  | "judgeBench"
  | "trophy"
  | "trophySilver"
  | "trophyBronze"
  | "scales"
  | "memoryCard"
  | "calendar"
  | "evidenceFolder"
  | "archiveBox"
  | "documentTray"
  | "pencilCup"
  | "chest1"
  | "chest2"
  | "chest3"
  | "chest4"
  | "chest5"
  | "chest6"
  | "benchFront"
  | `judge-${string}`
  | CollectibleId;

/**
 * Pre-rendered 48×48 low-poly prop, scaled by a whole number (1×, 2×, 3×) to keep pixels sharp.
 * `dim` (pending): slightly darker but still coloured; the text next to it carries the state.
 */
export function Sprite({ name, scale = 1, dim = false, className = "" }: { name: SpriteName; scale?: 1 | 2 | 3; dim?: boolean; className?: string }) {
  const size = 48 * scale;
  return (
    <img
      src={`/lowpoly/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={`sprite shrink-0 transition-[filter] duration-200 ease-[steps(2)] ${dim ? "brightness-[0.8] saturate-[0.6]" : ""} ${className}`}
    />
  );
}
