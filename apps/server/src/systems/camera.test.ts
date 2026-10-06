import type { NpcLook } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { composePhoto, segmentHitsBox, type PhotoScene } from "./camera";

const look: NpcLook = { skin: "skin_2", hair: "hair_brown", faceShape: "oval", jacket: "jacket_green", build: "slim" };
const wall = { minX: -5, maxX: 5, minZ: -3.25, maxZ: -2.75 };
const scene = (over: Partial<PhotoScene> = {}): PhotoScene => ({ people: [], vehicles: [], occluders: [], ...over });

// Camera at origin facing -Z (yaw 0).
describe("composePhoto", () => {
  it("describes a close person in detail and flags the Subject server-side", () => {
    const r = composePhoto({ x: 0, z: 0 }, 0, scene({ people: [{ pos: { x: 0, z: -5 }, look, isSubject: true }] }));
    expect(r.lines).toEqual(["A person, close: slim build, oval face, medium skin, brown hair, olive green jacket."]);
    expect(r.subjectInFrame).toBe(true);
    expect(r.lines.join(" ").toLowerCase()).not.toContain("subject");
  });

  it("gives only clothing and build at a distance", () => {
    const r = composePhoto({ x: 0, z: 0 }, 0, scene({ people: [{ pos: { x: 0, z: -15 }, look, isSubject: false }] }));
    expect(r.lines).toEqual(["A slim person in an olive green jacket, too far to make out a face."]);
  });

  it("misses people outside the frame, out of range or behind walls", () => {
    const people = [
      { pos: { x: 0, z: 5 }, look, isSubject: true }, // behind
      { pos: { x: 8, z: -2 }, look, isSubject: true }, // outside FOV
      { pos: { x: 0, z: -30 }, look, isSubject: true }, // too far
      { pos: { x: 0, z: -6 }, look, isSubject: true }, // behind the wall
    ];
    const r = composePhoto({ x: 0, z: 0 }, 0, scene({ people, occluders: [wall] }));
    expect(r.subjectInFrame).toBe(false);
    expect(r.lines).toEqual(["Nothing of note: street, walls, sky."]);
  });

  it("reads a plate only up close", () => {
    const v = { description: "grey sedan", plate: "CAL-7Q34" };
    expect(composePhoto({ x: 0, z: 0 }, 0, scene({ vehicles: [{ ...v, pos: { x: 0, z: -4 } }] })).lines).toEqual(["A grey sedan, plate CAL-7Q34."]);
    expect(composePhoto({ x: 0, z: 0 }, 0, scene({ vehicles: [{ ...v, pos: { x: 0, z: -14 } }] })).lines).toEqual(["A grey sedan, plate unreadable."]);
  });

  it("captions the photo with the nearest named area", () => {
    expect(composePhoto({ x: 8.5, z: -8 }, 0, scene()).area).toBe("by the park bench");
  });
});

describe("segmentHitsBox", () => {
  it("detects crossings and misses", () => {
    expect(segmentHitsBox({ x: 0, z: 0 }, { x: 0, z: -6 }, wall)).toBe(true);
    expect(segmentHitsBox({ x: 0, z: 0 }, { x: 0, z: -2 }, wall)).toBe(false);
    expect(segmentHitsBox({ x: 6, z: 0 }, { x: 6, z: -6 }, wall)).toBe(false);
  });
});
