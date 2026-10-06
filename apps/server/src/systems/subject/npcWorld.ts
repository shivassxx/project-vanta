import { randomBytes } from "node:crypto";
import { CASE_001_CIVILIANS, CASE_001_SUBJECT, CASE_001_WITNESSES, type PersonDef } from "@vanta/content/server";
import { NpcState, describeLook, type Box2, type NpcLook, type Vec2 } from "@vanta/shared";
import type { PersonStatus } from "../../persistence/WorldRepository";
import { segmentHitsBox } from "../camera";
import { Awareness, type Observer } from "./awareness";
import { Brain, type BrainEvent } from "./brain";

export type SubjectEvent =
  | { type: "subject.noticed"; by: Vec2; at: Vec2 }
  | { type: "subject.arrived"; node: number; note?: string }
  | { type: "subject.departed"; node: number; note?: string }
  | { type: "subject.leftDistrict"; key: string };

/** Ring nodes where a person can leave the district (office building, apartments). */
export const EXIT_NODES = [6, 0];

interface Person {
  id: string;
  key: string;
  isSubject: boolean;
  brain: Brain;
  awareness?: Awareness;
  look: NpcLook;
  conversation: string;
  dead: boolean;
}

const opaqueId = () => `npc_${randomBytes(4).toString("hex")}`;

/**
 * Server-side people of the district. Which one is the Subject, their plan and their
 * suspicion stay in this class; the schema only gets position, facing and appearance.
 */
export class NpcWorld {
  private readonly people: Person[] = [];

  constructor(
    defs: readonly PersonDef[] = [CASE_001_SUBJECT, ...CASE_001_CIVILIANS, ...CASE_001_WITNESSES],
    private readonly onEvent: (e: SubjectEvent) => void = () => undefined,
    /** Campaign memory: people who are gone or dead are not spawned again. */
    statusOf: (key: string) => PersonStatus = () => "present",
    /** Conversation IDs that exist for bodies (`body_<key>`). */
    private readonly bodyConversations: ReadonlySet<string> = new Set(),
  ) {
    for (const def of defs) {
      if (statusOf(def.key) !== "present") continue;
      this.people.push({
        key: def.key,
        id: opaqueId(),
        isSubject: def.key === CASE_001_SUBJECT.key,
        brain: new Brain(def.startNode, def.plan, def.walkSpeed, def.standAt),
        awareness: def.key === CASE_001_SUBJECT.key ? new Awareness() : undefined,
        look: def.look,
        conversation: def.conversation ?? "civilian",
        dead: false,
      });
    }
  }

  /** Creates schema entries for every person (appearance never changes). */
  populate(npcs: Map<string, NpcState>): void {
    for (const p of this.people) {
      const s = new NpcState();
      s.id = p.id;
      s.skin = p.look.skin;
      s.hair = p.look.hair;
      s.faceShape = p.look.faceShape;
      s.jacket = p.look.jacket;
      s.build = p.look.build;
      s.x = p.brain.pos.x;
      s.z = p.brain.pos.z;
      s.facing = p.brain.facing;
      npcs.set(p.id, s);
    }
  }

  tick(dt: number, observers: readonly Observer[], npcs: Map<string, NpcState>): void {
    const leaving: Person[] = [];
    for (const p of this.people) {
      if (p.dead) continue;
      p.brain.tick(dt, (e) => {
        if (e.type === "left") leaving.push(p);
        else if (p.isSubject) this.emitBrain(e);
      });
      if (p.awareness) {
        const culprit = p.awareness.update(dt, p.brain.pos, p.brain.facing, observers);
        if (culprit && p.brain.mode === "routine") this.notice(p, culprit.pos);
      }
      const s = npcs.get(p.id);
      if (s) {
        s.x = p.brain.pos.x;
        s.z = p.brain.pos.z;
        s.facing = p.brain.facing;
      }
    }
    for (const p of leaving) {
      this.people.splice(this.people.indexOf(p), 1);
      npcs.delete(p.id);
      this.onEvent({ type: "subject.leftDistrict", key: p.key });
    }
  }

  /** The Subject heads for the nearest exit and leaves the district. */
  subjectLeave(): void {
    this.people.find((p) => p.isSubject)?.brain.leave(EXIT_NODES);
  }

  /** Whether anyone (other than `except`) can see this spot: within range, no wall between. */
  witnessesNear(pos: Vec2, range: number, occluders: readonly Box2[], except?: string): boolean {
    return this.people.some(
      (p) => !p.dead && p.id !== except && Math.hypot(p.brain.pos.x - pos.x, p.brain.pos.z - pos.z) <= range && !occluders.some((b) => segmentHitsBox(p.brain.pos, pos, b)),
    );
  }

  /** Server-only lookups for conversations; never sent to clients. */
  find(id: string): { pos: Vec2; conversation: string; observed: string; isSubject: boolean } | undefined {
    const p = this.people.find((x) => x.id === id);
    if (!p) return undefined;
    const conversation = p.dead ? (this.bodyConversations.has(`body_${p.key}`) ? `body_${p.key}` : "body") : p.conversation;
    const observed = p.dead ? `On the ground: ${describeLook(p.look)}` : describeLook(p.look);
    return { pos: p.brain.pos, conversation, observed, isSubject: p.isSubject };
  }

  /** A person dies where they are. Their body stays visible in this room. Returns false if unknown. */
  kill(key: string, npcs: Map<string, NpcState>): boolean {
    const p = this.people.find((x) => x.key === key);
    if (!p || p.dead) return false;
    p.dead = true;
    p.awareness = undefined;
    const s = npcs.get(p.id);
    if (s) s.down = true;
    return true;
  }

  /** Server-only snapshot for the phone camera. */
  photoPeople(): { pos: Vec2; look: NpcLook; isSubject: boolean; down: boolean }[] {
    return this.people.map((p) => ({ pos: { ...p.brain.pos }, look: p.look, isSubject: p.isSubject, down: p.dead }));
  }

  /** Someone walked up and spoke to this person. For the Subject that is unmistakable surveillance. */
  confront(id: string, from: Vec2): void {
    const p = this.people.find((x) => x.id === id);
    if (p?.isSubject && p.brain.mode === "routine") this.notice(p, from);
  }

  private notice(p: Person, from: Vec2): void {
    p.brain.faceToward(from);
    p.brain.evade(from, (e) => this.emitBrain(e));
    p.awareness?.reset();
    // Emitted last: the case may react (e.g. order the Subject to leave) and must not be overridden.
    this.onEvent({ type: "subject.noticed", by: from, at: { ...p.brain.pos } });
  }

  /** For the (future) case engine and debug tools; never sent to clients. */
  subjectPosition(): Vec2 | undefined {
    return this.people.find((p) => p.isSubject)?.brain.pos;
  }

  subjectSuspicion(): number {
    return this.people.find((p) => p.isSubject)?.awareness?.suspicion ?? 0;
  }

  private emitBrain(e: BrainEvent): void {
    if (e.type === "arrived") this.onEvent({ type: "subject.arrived", node: e.node, note: e.note });
    else if (e.type === "departed") this.onEvent({ type: "subject.departed", node: e.node, note: e.note });
  }
}
