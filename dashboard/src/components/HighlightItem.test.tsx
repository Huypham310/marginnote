import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Highlight } from "@/lib/types";
import { HighlightItem } from "./HighlightItem";

// the real actions call the API + next/cache; here we only care what the component sends
const actions = vi.hoisted(() => ({
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));
vi.mock("@/app/pages/[id]/actions", () => actions);

const h: Highlight = {
  id: 7,
  pageId: 1,
  text: "Quoted passage",
  note: "old note",
  color: "yellow",
  anchor: { exact: "Quoted passage", prefix: "", suffix: "" },
  tags: ["ml"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("HighlightItem", () => {
  it("shows the quote, note and tag links", () => {
    render(<HighlightItem h={h} />);
    expect(screen.getByText("Quoted passage")).toBeTruthy();
    expect(screen.getByText("old note")).toBeTruthy();
    expect(screen.getByRole("link", { name: "#ml" }).getAttribute("href")).toBe("/search?tag=ml");
    expect(screen.getByRole("button", { name: "Color yellow" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("saves the edited note and tags, then closes the form", async () => {
    actions.updateHighlight.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<HighlightItem h={h} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const note = screen.getByLabelText("Note");
    await user.clear(note);
    await user.type(note, "new note");
    const tags = screen.getByLabelText("Tags");
    await user.clear(tags);
    await user.type(tags, "ml, todo");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(actions.updateHighlight).toHaveBeenCalledWith(7, { note: "new note", tags: "ml, todo" });
    await waitFor(() => expect(screen.queryByLabelText("Note")).toBeNull());
  });

  it("keeps the form open and shows the error when saving fails", async () => {
    actions.updateHighlight.mockResolvedValue({ ok: false, error: '"c++" isn\'t a valid tag' });
    const user = userEvent.setup();
    render(<HighlightItem h={h} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect((await screen.findByRole("alert")).textContent).toContain("valid tag");
    expect(screen.getByLabelText("Note")).toBeTruthy();
  });

  it("cancel throws away the unsaved text", async () => {
    const user = userEvent.setup();
    render(<HighlightItem h={h} />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Note"), " typo");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect((screen.getByLabelText("Note") as HTMLTextAreaElement).value).toBe("old note");
  });

  it("recolors with one click; the current color is disabled", async () => {
    actions.updateHighlight.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<HighlightItem h={h} />);
    expect((screen.getByRole("button", { name: "Color yellow" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Color blue" }));
    expect(actions.updateHighlight).toHaveBeenCalledWith(7, { color: "blue" });
  });

  it("asks before deleting", async () => {
    actions.deleteHighlight.mockResolvedValue({ ok: true });
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    const user = userEvent.setup();
    render(<HighlightItem h={h} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(actions.deleteHighlight).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(actions.deleteHighlight).toHaveBeenCalledWith(7);
  });
});
