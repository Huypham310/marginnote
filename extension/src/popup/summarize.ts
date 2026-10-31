import { env, pipeline, type SummarizationPipeline } from "@huggingface/transformers";
import { SUMMARY_MODELS, type SummaryModel } from "../shared/settings";

// MV3 forbids loading code from a CDN, so ONNX Runtime ships inside the extension:
// the JS glue is copied to dist/ort by vite.config.ts, the .wasm is emitted by Vite into assets/.
// Model weights are data, those still come from the Hugging Face Hub.
env.backends.onnx.wasm!.wasmPaths = {
  mjs: chrome.runtime.getURL("ort/ort-wasm-simd-threaded.asyncify.mjs"),
  wasm: chrome.runtime.getURL("assets/ort-wasm-simd-threaded.asyncify.wasm"),
};
// no cross-origin isolation in a popup -> no SharedArrayBuffer -> single thread
env.backends.onnx.wasm!.numThreads = 1;
env.allowLocalModels = false;

// rough budget so the input fits the model's context (512 tokens t5, 1024 bart)
const MAX_INPUT_CHARS: Record<SummaryModel, number> = { fast: 2500, better: 4000 };

let cached: { model: SummaryModel; pipe: SummarizationPipeline } | null = null;

export interface Progress {
  file: string;
  loadedMb: number;
  totalMb: number;
}

async function getPipeline(model: SummaryModel, onProgress: (p: Progress) => void) {
  if (cached?.model === model) return cached.pipe;
  const pipe = (await pipeline("summarization", SUMMARY_MODELS[model].id, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === "progress" && p.file && p.total) {
        onProgress({ file: p.file, loadedMb: (p.loaded ?? 0) / 1e6, totalMb: p.total / 1e6 });
      }
    },
  })) as SummarizationPipeline;
  cached = { model, pipe };
  return pipe;
}

/** Summarizes the start of the page text. Returns the summary and whether input was cut. */
export async function summarize(
  text: string,
  model: SummaryModel,
  onProgress: (p: Progress) => void = () => {},
): Promise<{ summary: string; truncated: boolean }> {
  const limit = MAX_INPUT_CHARS[model];
  const truncated = text.length > limit;
  // cắt ở ranh giới câu gần nhất để model không nhận nửa câu
  let input = text.slice(0, limit);
  if (truncated) input = input.slice(0, Math.max(input.lastIndexOf(". ") + 1, limit / 2));

  const pipe = await getPipeline(model, onProgress);
  const [out] = (await pipe(SUMMARY_MODELS[model].prefix + input, {
    max_new_tokens: 120,
    min_new_tokens: 25,
    no_repeat_ngram_size: 3,
  })) as { summary_text: string }[];
  return { summary: out.summary_text.trim(), truncated };
}
