import type { EvidenceItem } from "@vanta/shared";
import { DVR_INTERACTION } from "../cases/case001Evidence";
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
    id: "case001.ev.cafeCctv",
    kind: "record",
    title: "Café CCTV, 08:05–08:20",
    description:
      "08:06 Elena enters with a man in a grey coat. 08:14 he slides a small envelope across the table; she puts it in her bag without opening it. 08:19 they leave toward the park. Across the street, a heavy man in a black jacket with grey hair watches them the whole time.",
  },
  {
    id: "case001.ev.smokerBody",
    kind: "object",
    title: "The watcher, dead",
    description:
      "The grey-haired man in the black jacket, slumped against the park wall. No wallet, no visible wounds. A cheap phone in his pocket: one number called again and again, the last call at 08:40.",
  },
  {
    id: "case001.ev.subjectWords",
    kind: "testimony",
    title: "Elena, when warned",
    description: "'I know. I've known since Tuesday.' She did not ask who you were. She left toward the office building without looking back.",
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
        {
          id: "cctv",
          text: "I need to see your camera footage from this morning. [use your background]",
          requires: { profession: ["police_officer", "security_worker", "private_investigator"] },
          next: "cctv",
        },
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
    cctv: {
      line: "...Fine. The recorder's in the back. Don't touch anything else. Here, from when we opened.",
      options: [{ id: "watch", text: "Watch the footage.", gives: "case001.ev.cafeCctv" }],
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

const CCTV = "case001.ev.cafeCctv";

/**
 * Talking to the Subject directly is the most obvious surveillance there is.
 * With enough evidence, players can intervene. No option is marked as the right one.
 */
export const SUBJECT_CONVERSATION: ConversationDef = {
  id: "subject",
  start: "start",
  nodes: {
    start: {
      line: "...Do I know you?",
      options: [
        { id: "sorry", text: "Sorry, wrong person." },
        { id: "name", text: "Elena?", requires: { info: NAME }, next: "name" },
        {
          id: "warn",
          text: "A man in a black jacket has been watching you since the café. [warn her]",
          requires: { evidence: CCTV },
          next: "warned",
          gives: "case001.ev.subjectWords",
        },
        { id: "envelope", text: "What was in the envelope he gave you?", requires: { evidence: CCTV }, next: "envelope" },
      ],
    },
    name: { line: "I don't know who you are. Leave me alone.", options: [{ id: "go", text: "[let her go]" }] },
    warned: {
      line: "...I know. I've known since Tuesday. Thank you. I have to go now.",
      options: [{ id: "go", text: "[let her go]" }],
    },
    envelope: {
      line: "That's none of your business. Who sent you?",
      options: [
        { id: "nobody", text: "Nobody. Be careful." },
        { id: "threaten", text: "Give me the envelope. Now. [threaten her]", crime: "threat" },
      ],
    },
  },
};

/** Examining a body. The scene says what it shows, nothing about who did it. */
export const BODY_SMOKER: ConversationDef = {
  id: "body_witness_smoker",
  start: "start",
  nodes: {
    start: {
      line: "He doesn't move. Grey hair, black jacket. The man from the bench.",
      options: [
        { id: "search", text: "Check his pockets.", gives: "case001.ev.smokerBody" },
        { id: "leave", text: "Step away." },
      ],
    },
  },
};

export const GENERIC_BODY: ConversationDef = {
  id: "body",
  start: "start",
  nodes: { start: { line: "They don't respond.", options: [{ id: "leave", text: "Step away." }] } },
};

export const CASE_001_CONVERSATIONS: ReadonlyMap<string, ConversationDef> = new Map(
  [BARISTA, SMOKER, GENERIC_CIVILIAN, SUBJECT_CONVERSATION, SEDAN_INTERACTION, DVR_INTERACTION, BODY_SMOKER, GENERIC_BODY].map((c) => [c.id, c]),
);
