import { describe, expect, it } from "vitest";
import { CASE_001_EVIDENCE_ITEMS } from "../cases/case001EvidenceIndex";
import { CASE_001_CIVILIANS, CASE_001_SUBJECT, CASE_001_WITNESSES } from "../cases/case001Secret";
import { CASE_001_CONVERSATIONS } from "./case001Conversations";
import { validateConversation } from "./validate";

describe("CASE_001 conversations", () => {
  it("are all valid", () => {
    const known = new Set(CASE_001_EVIDENCE_ITEMS.keys());
    for (const c of CASE_001_CONVERSATIONS.values()) expect(validateConversation(c, known)).toEqual([]);
  });

  it("exist for every person that names one", () => {
    for (const p of [CASE_001_SUBJECT, ...CASE_001_CIVILIANS, ...CASE_001_WITNESSES]) {
      if (p.conversation) expect(CASE_001_CONVERSATIONS.has(p.conversation)).toBe(true);
    }
  });

  it("validator catches broken links, unknown evidence and dead ends", () => {
    const p = validateConversation(
      {
        id: "x",
        start: "nope",
        nodes: { a: { line: "", options: [{ id: "o", text: "", next: "ghost", gives: "ev?", requires: { info: "i" } }] } },
      },
      new Set(),
    );
    expect(p).toEqual([
      "x: missing start node nope",
      "x.a.o: unknown next ghost",
      "x.a.o: unknown evidence ev?",
      "x.a: no unconditional option",
    ]);
  });
});
