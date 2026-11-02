import { beforeEach, describe, expect, it } from "vitest";
import { buildTextIndex, describeRange, findAnchor } from "../src/content/anchor";

/** First text node whose data contains `needle`. */
function textNode(needle: string): Text {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n as Text).data.includes(needle)) return n as Text;
  }
  throw new Error(`no text node with "${needle}"`);
}

function range(start: Node, startOffset: number, end: Node, endOffset: number): Range {
  const r = document.createRange();
  r.setStart(start, startOffset);
  r.setEnd(end, endOffset);
  return r;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("buildTextIndex", () => {
  it("skips scripts, styles, inputs and our own toolbar", () => {
    document.body.innerHTML = `
      <p>visible</p><script>var hidden = 1</script><style>p{}</style>
      <textarea>typed</textarea><div data-mn-ui><button>Highlight</button></div><p>also visible</p>`;
    const { text } = buildTextIndex(document.body);
    expect(text).toContain("visible");
    expect(text).toContain("also visible");
    for (const s of ["hidden", "p{}", "typed", "Highlight"]) expect(text).not.toContain(s);
  });
});

describe("describeRange", () => {
  it("stores the quote with up to 32 chars of context", () => {
    document.body.innerHTML = "<p>Some intro text before. The important sentence. And what comes after it here.</p>";
    const node = textNode("important");
    const start = node.data.indexOf("The important");
    const anchor = describeRange(document.body, range(node, start, node, start + "The important sentence.".length));
    expect(anchor.exact).toBe("The important sentence.");
    expect(anchor.prefix).toBe("Some intro text before. ");
    expect(anchor.suffix).toBe(" And what comes after it here.");
  });

  it("handles a selection across elements", () => {
    document.body.innerHTML = "<p>start <b>bold part</b> end</p>";
    const anchor = describeRange(document.body, range(textNode("start"), 2, textNode(" end"), 2));
    expect(anchor.exact).toBe("art bold part e");
  });

  it("handles range boundaries that sit on elements instead of text nodes", () => {
    document.body.innerHTML = "<p id=a>first</p><p id=b>second</p>";
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    // (a, 0) .. (b, 1) = whole of both paragraphs
    expect(describeRange(document.body, range(a, 0, b, 1)).exact).toBe("firstsecond");
  });
});

describe("findAnchor", () => {
  it("round-trips with describeRange after the page re-renders", () => {
    const html = "<article><h1>Title</h1><p>Alpha beta <em>gamma</em> delta.</p></article>";
    document.body.innerHTML = html;
    const anchor = describeRange(document.body, range(textNode("Alpha"), 6, textNode(" delta"), 6));
    expect(anchor.exact).toBe("beta gamma delta");

    // fresh DOM, same content (like a reload)
    document.body.innerHTML = html;
    const found = findAnchor(document.body, anchor)!;
    expect(found.toString()).toBe("beta gamma delta");
  });

  it("picks the occurrence whose context matches when the quote repeats", () => {
    document.body.innerHTML = `
      <p>In chapter one, the answer is 42. That was easy.</p>
      <p>In chapter two, the answer is 42. That was hard.</p>`;
    const second = textNode("chapter two");
    const at = second.data.indexOf("the answer is 42.");
    const anchor = describeRange(document.body, range(second, at, second, at + "the answer is 42.".length));

    const found = findAnchor(document.body, anchor)!;
    expect(found.startContainer).toBe(second);
    expect(found.startOffset).toBe(at);
  });

  it("still finds the quote when the context changed a bit", () => {
    document.body.innerHTML = "<p>Edited intro. Keep this exact quote. Edited outro.</p>";
    const found = findAnchor(document.body, {
      exact: "Keep this exact quote.",
      prefix: "Original intro. ",
      suffix: " Original outro.",
    });
    expect(found?.toString()).toBe("Keep this exact quote.");
  });

  it("returns null when the text is gone or the anchor is empty", () => {
    document.body.innerHTML = "<p>nothing to see</p>";
    expect(findAnchor(document.body, { exact: "missing quote", prefix: "", suffix: "" })).toBeNull();
    expect(findAnchor(document.body, { exact: "", prefix: "", suffix: "" })).toBeNull();
  });

  it("ends the range in the right node when the quote ends exactly at a node boundary", () => {
    document.body.innerHTML = "<p><span>one</span><span>two</span></p>";
    const found = findAnchor(document.body, { exact: "one", prefix: "", suffix: "two" })!;
    // end should stay in "one" (offset 3), not jump to the start of "two"
    expect(found.endContainer).toBe(textNode("one"));
    expect(found.endOffset).toBe(3);
  });
});
