export interface PaletteEntry {
  id: string;
  hex: number;
  name: string;
}

export const SKIN_TONES: readonly PaletteEntry[] = [
  { id: "skin_1", hex: 0xf1d3b8, name: "light" },
  { id: "skin_2", hex: 0xd9a77c, name: "medium" },
  { id: "skin_3", hex: 0xa9714a, name: "tan" },
  { id: "skin_4", hex: 0x6b4430, name: "dark" },
];

export const HAIR_COLORS: readonly PaletteEntry[] = [
  { id: "hair_black", hex: 0x15120f, name: "black" },
  { id: "hair_brown", hex: 0x4a2f1c, name: "brown" },
  { id: "hair_blond", hex: 0xc9a35a, name: "blond" },
  { id: "hair_red", hex: 0x8a3b1e, name: "red" },
  { id: "hair_grey", hex: 0x9a9a9a, name: "grey" },
];

export const JACKET_COLORS: readonly PaletteEntry[] = [
  { id: "jacket_grey", hex: 0x6a6f75, name: "grey" },
  { id: "jacket_navy", hex: 0x24344d, name: "navy" },
  { id: "jacket_green", hex: 0x3f5a3a, name: "olive green" },
  { id: "jacket_red", hex: 0x8c2f2f, name: "dark red" },
  { id: "jacket_tan", hex: 0xb59a6a, name: "tan" },
  { id: "jacket_black", hex: 0x1b1b1d, name: "black" },
];

export const FACE_SHAPES = ["round", "oval", "angular"] as const;
export const BUILDS = ["slim", "average", "heavy"] as const;

/** Observable appearance. The face is what a Subject photo shows; clothing is not in the photo. */
export interface FaceLook {
  skin: string;
  hair: string;
  faceShape: (typeof FACE_SHAPES)[number];
}

export interface NpcLook extends FaceLook {
  jacket: string;
  build: (typeof BUILDS)[number];
}

const find = (palette: readonly PaletteEntry[], id: string): PaletteEntry =>
  palette.find((p) => p.id === id) ?? (palette[0] as PaletteEntry);

export const skinHex = (id: string) => find(SKIN_TONES, id).hex;
export const hairHex = (id: string) => find(HAIR_COLORS, id).hex;
export const jacketHex = (id: string) => find(JACKET_COLORS, id).hex;

/** What a player can tell by looking at someone up close. Never a verdict. */
export function describeLook(look: NpcLook): string {
  const hair = find(HAIR_COLORS, look.hair).name;
  const skin = find(SKIN_TONES, look.skin).name;
  const jacket = find(JACKET_COLORS, look.jacket).name;
  return `${look.build} build, ${look.faceShape} face, ${skin} skin, ${hair} hair, ${jacket} jacket`;
}

export const VEHICLE_COLORS: readonly PaletteEntry[] = [
  { id: "car_grey", hex: 0x7d838a, name: "grey" },
  { id: "car_red", hex: 0x8e2a26, name: "red" },
  { id: "car_white", hex: 0xd8d8d4, name: "white" },
];

export const vehicleHex = (id: string) => find(VEHICLE_COLORS, id).hex;
