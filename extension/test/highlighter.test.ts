import { beforeEach, describe, expect, it } from "vitest";
import { findAnchor } from "../src/content/anchor";
import { marksFor, recolor, unwrap, wrapRange } from "../src/content/highlighter";

function rangeFor(exact: string, prefix = "", suffix = ""): Range {
  const r = findAnchor(document.body, { exact, prefix, suffix });
  if (!r) throw new Error(`"${exact}" not on the page`);
  return r;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("wrapRange", () => {
  it("wraps part of one text node", () => {
    document.body.innerHTML = "<p>hello brave new world</p>";
    const marks = wrapRange(rangeFor("brave new"), 7, "green");
    expect(marks).toHaveLength(1);
    expect(document.body.innerHTML).toBe(
      '<p>hello <mark class="mn-hl mn-hl-green" data-mn-id="7">brave new</mark> world</p>',
    );
  });

  it("uses one mark per text node across elements, all with the same id", () => {
    document.body.innerHTML = "<p>one <a href=#>two</a> three</p>";
    const marks = wrapRange(rangeFor("ne two thr"), 3, "yellow");
    expect(marks.map((m) => m.textContent)).toEqual(["ne ", "two", " thr"]);
    expect(new Set(marks.map((m) => m.dataset.mnId))).toEqual(new Set(["3"]));
    // the link is still a link, the mark sits inside it
    expect(document.querySelector("a > mark")?.textContent).toBe("two");
  });

  it("skips whitespace-only nodes between blocks", () => {
    document.body.innerHTML = "<p>end of first</p>\n   <p>start of second</p>";
    const r = document.createRange();
    r.setStart(document.querySelector("p")!.firstChild!, 7);
    r.setEnd(document.querySelectorAll("p")[1].firstChild!, 5);
    const marks = wrapRange(r, 1, "blue");
    expect(marks.map((m) => m.textContent)).toEqual(["first", "start"]);
  });
});

describe("unwrap", () => {
  it("puts the original text back and merges the split nodes", () => {
    const html = "<p>one <b>two</b> three</p>";
    document.body.innerHTML = html;
    wrapRange(rangeFor("ne two thr"), 5, "pink");
    expect(marksFor(document, 5)).toHaveLength(3);

    unwrap(document, 5);
    expect(document.body.innerHTML).toBe(html);
    // normalize() merged "o" + "ne " back into one text node
    expect(document.querySelector("p")!.firstChild!.textContent).toBe("one ");
  });

  it("only touches marks of that highlight", () => {
    document.body.innerHTML = "<p>aaa bbb ccc</p>";
    wrapRange(rangeFor("aaa"), 1, "yellow");
    wrapRange(rangeFor("ccc"), 2, "yellow");
    unwrap(document, 1);
    expect(marksFor(document, 1)).toHaveLength(0);
    expect(marksFor(document, 2)).toHaveLength(1);
  });
});

describe("recolor", () => {
  it("swaps the color class on every mark", () => {
    document.body.innerHTML = "<p>x <i>y</i> z</p>";
    wrapRange(rangeFor("x y z"), 9, "yellow");
    recolor(document, 9, "purple");
    for (const m of marksFor(document, 9)) expect(m.className).toBe("mn-hl mn-hl-purple");
  });
});
