import type { EvidenceItem } from "@vanta/shared";
import { SEDAN_INTERACTION } from "../cases/case001Vehicles";
import type { ConversationDef } from "./types";

const PHOTO = "case001.subject.photo";
const NAME = "case001.subject.fullName";
const RECEIPT = "case001.ev.cafeReceipt";

/** Statements players can collect. They record what was said, not whether it is true. */
export const CASE_001_TESTIMONY: readonly EvidenceItem[] = [
  {
    id: "case001.ev.baristaStatement",
    kind: "testimony",
    title: "Barista's statement",
    description:
      "Elena came in with an older man in a grey coat. He paid for both coffees and kept watching the door. They left toward the park. She looked like she hadn't slept.",
  },
  {
    id: "case001.ev.baristaReceipt",
    kind: "testimony",
    title: "Barista on the receipt",
    description: "The card ending 4471 belongs to the man, not Elena. He has paid for her before. 'R.Y. THU' is not the café's writing.",
  },
  {
    id: "case001.ev.smokerStatement",
    kind: "testimony",
    title: "Smoker's statement",
    description: "Says he saw the woman get into a red car with a man and drive north about twenty minutes ago.",
  },
  {
    id: "case001.ev.smokerBench",
    kind: "testimony",
    title: "Smoker on the bench",
    description: "Claims nobody sat at the park bench this morning.",
  },
];

/** Honest witness: tells what she saw, more if shown the receipt. */
export const BARISTA: ConversationDef = {
  id: "barista",
  start: "start",
  nodes: {
    start: {
      line: "Morning. What can I get you?",
      options: [
        { id: "photo", text: "Have you seen this woman? [show photo]", requires: { info: PHOTO }, next: "recognize" },
        { id: "name", text: "Do you know Elena Marsh Varga?", requires: { info: NAME }, next: "recognize" },
        { id: "receipt", text: "Was this paid here? [show receipt]", requires: { evidence: RECEIPT }, next: "receipt" },
        { id: "nothing", text: "Just looking around." },
      ],
    },
    recognize: {
      line: "Elena? She comes in most mornings. Today she wasn't alone. Older man, grey coat. He paid for both and kept watching the door. They left toward the park. She looked like she hadn't slept.",
      options: [
        { id: "note", text: "Thanks. That helps.", gives: "case001.ev.baristaStatement" },
        { id: "receipt2", text: "Was this paid here? [show receipt]", requires: { evidence: RECEIPT }, next: "receipt", gives: "case001.ev.baristaStatement" },
      ],
    },
    receipt: {
      line: "That's ours. Card ending 4471... that's his card, the man in the grey coat. He's paid for her before. The writing on the back isn't ours.",
      options: [{ id: "thanks", text: "Thank you.", gives: "case001.ev.baristaReceipt" }],
    },
  },
};

/** Deceptive witness: has his own reasons to send people the wrong way. */
export const SMOKER: ConversationDef = {
  id: "smoker",
  start: "start",
  nodes: {
    start: {
      line: "What?",
      options: [
        { id: "photo", text: "Have you seen this woman? [show photo]", requires: { info: PHOTO }, next: "lie" },
        { id: "bench", text: "Anyone at that bench this morning?", next: "bench" },
        { id: "leave", text: "Never mind." },
      ],
    },
    lie: {
      line: "Yeah. Got into a red car with some guy. Went north, maybe twenty minutes ago. That's all I know.",
      options: [
        { id: "ok", text: "Thanks.", gives: "case001.ev.smokerStatement" },
        {
          id: "press",
          text: "You're sure? I can check that. [use your background]",
          requires: { profession: ["police_officer", "private_investigator", "ex_intelligence"] },
          next: "nervous",
          gives: "case001.ev.smokerStatement",
        },
      ],
    },
    bench: {
      line: "Nobody. Quiet morning.",
      options: [{ id: "ok", text: "Alright.", gives: "case001.ev.smokerBench" }],
    },
    nervous: {
      line: "...Look, I don't want trouble. I told you what I saw. Just leave it.",
      options: [{ id: "end", text: "We'll see." }],
    },
  },
};

/** Anyone without an authored conversation. */
export const GENERIC_CIVILIAN: ConversationDef = {
  id: "civilian",
  start: "start",
  nodes: {
    start: {
      line: "Sorry, I'm in a hurry.",
      options: [
        { id: "photo", text: "Have you seen this woman? [show photo]", requires: { info: PHOTO }, next: "no" },
        { id: "bye", text: "No problem." },
      ],
    },
    no: { line: "Don't think so. Sorry.", options: [{ id: "bye", text: "Thanks anyway." }] },
  },
};

/** Talking to the Subject directly is the most obvious surveillance there is. */
export const SUBJECT_CONVERSATION: ConversationDef = {
  id: "subject",
  start: "start",
  nodes: {
    start: {
      line: "...Do I know you?",
      options: [
        { id: "sorry", text: "Sorry, wrong person." },
        { id: "name", text: "Elena?", requires: { info: NAME }, next: "name" },
      ],
    },
    name: { line: "I don't know who you are. Leave me alone.", options: [{ id: "go", text: "[let her go]" }] },
  },
};

export const CASE_001_CONVERSATIONS: ReadonlyMap<string, ConversationDef> = new Map(
  [BARISTA, SMOKER, GENERIC_CIVILIAN, SUBJECT_CONVERSATION, SEDAN_INTERACTION].map((c) => [c.id, c]),
);
