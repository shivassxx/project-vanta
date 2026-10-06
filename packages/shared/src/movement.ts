export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned box on the ground plane. */
export interface Box2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const PLAYER_RADIUS = 0.4;
export const WALK_SPEED = 3.5;
export const SPRINT_SPEED = 6;

function pushOut(p: Vec2, r: number, b: Box2): Vec2 {
  const cx = Math.min(Math.max(p.x, b.minX), b.maxX);
  const cz = Math.min(Math.max(p.z, b.minZ), b.maxZ);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return p;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * r, z: cz + (dz / d) * r };
  }
  // Center is inside the box: exit through the nearest face.
  const exits = [
    { d: p.x - b.minX, x: b.minX - r, z: p.z },
    { d: b.maxX - p.x, x: b.maxX + r, z: p.z },
    { d: p.z - b.minZ, x: p.x, z: b.minZ - r },
    { d: b.maxZ - p.z, x: p.x, z: b.maxZ + r },
  ];
  const best = exits.reduce((a, c) => (c.d < a.d ? c : a));
  return { x: best.x, z: best.z };
}

/** Kinematic circle-vs-boxes move; slides along walls. */
export function moveWithCollision(pos: Vec2, delta: Vec2, boxes: readonly Box2[], r = PLAYER_RADIUS): Vec2 {
  // Sub-step so a large delta cannot tunnel through thin walls.
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.1));
  let p: Vec2 = pos;
  for (let s = 0; s < steps; s++) {
    p = { x: p.x + delta.x / steps, z: p.z + delta.z / steps };
    for (let i = 0; i < 2; i++) for (const b of boxes) p = pushOut(p, r, b);
  }
  return p;
}

/** Turns camera-relative input axes into a world-space direction (camera yaw in radians). */
export function worldDirection(axis: { x: number; y: number }, yaw: number): Vec2 {
  const len = Math.hypot(axis.x, axis.y);
  if (len === 0) return { x: 0, z: 0 };
  const nx = axis.x / len;
  const ny = axis.y / len;
  // Camera looks along (-sin yaw, -cos yaw) on the ground plane.
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  return { x: fx * ny + -fz * nx, z: fz * ny + fx * nx };
}
