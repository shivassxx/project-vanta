import { randomBytes } from "node:crypto";
import { CASE_001_CIVILIANS, CASE_001_SUBJECT, type PersonDef } from "@vanta/content/server";
import { NpcState, type NpcLook, type Vec2 } from "@vanta/shared";
import { Awareness, type Observer } from "./awareness";
import { Brain, type BrainEvent } from "./brain";

export type SubjectEvent =
  | { type: "subject.noticed"; by: Vec2; at: Vec2 }
  | { type: "subject.arrived"; node: number; note?: string }
  | { type: "subject.departed"; node: number; note?: string };

interface Person {
  id: string;
  isSubject: boolean;
  brain: Brain;
  awareness?: Awareness;
  look: NpcLook;
}

const opaqueId = () => `npc_${randomBytes(4).toString("hex")}`;

/**
 * Server-side people of the district. Which one is the Subject, their plan and their
 * suspicion stay in this class; the schema only gets position, facing and appearance.
 */
export class NpcWorld {
  private readonly people: Person[] = [];

  constructor(
    defs: readonly PersonDef[] = [CASE_001_SUBJECT, ...CASE_001_CIVILIANS],
    private readonly onEvent: (e: SubjectEvent) => void = () => undefined,
  ) {
    for (const def of defs) {
      this.people.push({
        id: opaqueId(),
        isSubject: def.key === CASE_001_SUBJECT.key,
        brain: new Brain(def.startNode, def.plan, def.walkSpeed),
        awareness: def.key === CASE_001_SUBJECT.key ? new Awareness() : undefined,
        look: def.look,
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
    for (const p of this.people) {
      p.brain.tick(dt, (e) => p.isSubject && this.emitBrain(e));
      if (p.awareness) {
        const culprit = p.awareness.update(dt, p.brain.pos, p.brain.facing, observers);
        if (culprit && p.brain.mode !== "evading") {
          this.onEvent({ type: "subject.noticed", by: culprit.pos, at: { ...p.brain.pos } });
          p.brain.faceToward(culprit.pos);
          p.brain.evade(culprit.pos, (e) => this.emitBrain(e));
          p.awareness.reset();
        }
      }
      const s = npcs.get(p.id);
      if (s) {
        s.x = p.brain.pos.x;
        s.z = p.brain.pos.z;
        s.facing = p.brain.facing;
      }
    }
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
