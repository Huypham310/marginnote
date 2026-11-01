import type { Color } from "./types";

// Full class names spelled out so Tailwind's scanner picks them up (no string building).
// Same palette as the extension's content.css.
export const BORDER: Record<Color, string> = {
  yellow: "border-yellow-400",
  green: "border-green-400",
  blue: "border-blue-400",
  pink: "border-pink-400",
  purple: "border-violet-400",
};

export const SWATCH: Record<Color, string> = {
  yellow: "bg-yellow-300",
  green: "bg-green-300",
  blue: "bg-blue-300",
  pink: "bg-pink-300",
  purple: "bg-violet-300",
};
