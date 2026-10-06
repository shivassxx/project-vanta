import { describe, expect, it } from "vitest";
import { describeLook } from "./appearance";

describe("describeLook", () => {
  it("describes only observable traits", () => {
    const text = describeLook({ skin: "skin_2", hair: "hair_black", faceShape: "round", jacket: "jacket_grey", build: "average" });
    expect(text).toBe("average build, round face, medium skin, black hair, grey jacket");
  });
});
