import { ApiError } from "@/lib/api";

/**
 * Inline error box. Server components render this themselves instead of throwing,
 * because Next hides server error messages from error.tsx in production builds.
 */
export function ErrorNote({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong";
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
