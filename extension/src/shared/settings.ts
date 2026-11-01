import type { Color } from "./types";

export const SUMMARY_MODELS = {
  fast: { id: "Xenova/t5-small", label: "Fast (t5-small, ~75 MB)", prefix: "summarize: " },
  better: {
    id: "Xenova/distilbart-cnn-6-6",
    label: "Better (distilbart-cnn, ~270 MB)",
    prefix: "",
  },
} as const;
export type SummaryModel = keyof typeof SUMMARY_MODELS;

export interface Settings {
  apiUrl: string;
  apiToken: string;
  defaultColor: Color;
  summaryModel: SummaryModel;
}

export const DEFAULT_SETTINGS: Settings = {
  apiUrl: "http://localhost:4000",
  apiToken: "",
  defaultColor: "yellow",
  summaryModel: "fast",
};

// chrome.storage.sync để settings đi theo tài khoản Chrome sang máy khác
export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}
