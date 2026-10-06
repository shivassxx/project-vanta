import * as THREE from "three";
import {
  GAME_NAME,
  GREYBOX_WALLS,
  MSG_BOARD,
  MSG_BOARD_COMMAND,
  MSG_EVIDENCE,
  MSG_INPUT,
  MSG_INTERACT,
  MSG_KNOWLEDGE,
  MSG_PRIVATE_PROFILE,
  MSG_REQUEST_PRIVATE_SYNC,
  MSG_SHARE_ITEM,
  MSG_ABILITIES,
  MSG_DIALOGUE,
  MSG_USE_ABILITY,
  MSG_TAKE_PHOTO,
  MSG_DEBUG,
  MSG_DEBUG_STATE,
  type DebugCaseState,
  MSG_PHONE,
  MSG_VANTA_NOTICE,
  type PhoneMessage,
  type AbilityView,
  MSG_TALK,
  MSG_TALK_CHOICE,
  MSG_TALK_END,
  type DialogueView,
  SPRINT_SPEED,
  TICK_RATE,
  WALK_SPEED,
  moveWithCollision,
  vehicleBox,
  worldDirection,
  type GameState,
  type Board,
  type BoardCommand,
  type FoundEvidence,
  type InputMessage,
  type KnownInfo,
  type PrivateProfile,
  type ShareRequest,
  type Vec2,
} from "@vanta/shared";
import type { Room } from "colyseus.js";
import { ActionMap } from "./engine/actionMap";
import { clearCameraFraction } from "./engine/cameraCollision";
import { CAMERA_PRESETS, clampPitch, lerpPreset, resolveMode, type CameraPreset } from "./engine/cameraRig";
import { buildGreybox } from "./game/greybox";
import { createNpcMesh } from "./game/npcView";
import { npcInteractables } from "./game/observe";
import { syncSpots, spotInteractables } from "./game/spots";
import { syncVehicles, vehicleInteractables } from "./game/vehicles";
import { findInteractable } from "./game/interaction";
import { connect } from "./game/network";
import { SessionStore, type Teammate } from "./game/session";
import { mountOverlay } from "./ui/mount";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15191e);
scene.fog = new THREE.Fog(0x15191e, 20, 55);
scene.add(new THREE.HemisphereLight(0xbfd0e0, 0x30363d, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(8, 14, 6);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const greybox = buildGreybox();
scene.add(greybox.group);

// Placeholder characters: capsules.
const capsuleGeo = new THREE.CapsuleGeometry(0.35, 1.1, 4, 8);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x6f8aa3, transparent: true });
const player = new THREE.Mesh(capsuleGeo, playerMat);
scene.add(player);
const remoteMat = new THREE.MeshStandardMaterial({ color: 0xa36f6f });
const disconnectedMat = new THREE.MeshStandardMaterial({ color: 0xa36f6f, transparent: true, opacity: 0.3 });
const remotes = new Map<string, THREE.Mesh>();
const npcMeshes = new Map<string, THREE.Group>();

const input = new ActionMap();
// Typing into overlay inputs (notes, links) must not move the character.
const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
addEventListener("keydown", (e) => {
  if (!typing(e)) input.press(e.code);
});
addEventListener("keyup", (e) => input.release(e.code));
renderer.domElement.addEventListener("mousedown", (e) => {
  if (document.pointerLockElement !== renderer.domElement) void renderer.domElement.requestPointerLock();
  input.press(`Mouse${e.button}`);
});
addEventListener("mouseup", (e) => input.release(`Mouse${e.button}`));
addEventListener("contextmenu", (e) => e.preventDefault());

let yaw = 0;
let pitch = 0.35;
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0025;
  pitch = clampPitch(pitch + e.movementY * 0.0025);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const prompt = document.getElementById("prompt");
const status = document.getElementById("status");
const setStatus = (s: string) => status && (status.textContent = s);

let room: Room<GameState> | undefined;
const session = new SessionStore();
const leaveTalk = () => {
  room?.send(MSG_TALK_END);
  session.update({ dialogue: undefined });
};
mountOverlay(
  document.getElementById("ui"),
  {
    onShare: (itemId, toCharacterIds) => {
      const req: ShareRequest = { itemId, toCharacterIds };
      room?.send(MSG_SHARE_ITEM, req);
    },
    onBoard: (cmd: BoardCommand) => room?.send(MSG_BOARD_COMMAND, cmd),
    onChoose: (optionId) => room?.send(MSG_TALK_CHOICE, { optionId }),
    onLeaveTalk: leaveTalk,
    onAbility: (id) => room?.send(MSG_USE_ABILITY, { id }),
    onDebugAdvance: (sec) => room?.send(MSG_DEBUG, { cmd: "advance", sec }),
  },
  session,
);

// Public room state -> overlay (IGL designation, teammate list), polled at low rate.
// Dev builds: refresh the debug case view while the panel is open.
if (import.meta.env.DEV) setInterval(() => session.get().debugOpen && room?.send(MSG_DEBUG, { cmd: "state" }), 1000);

let lastPublic = "";
setInterval(() => {
  if (!room?.state.players) return;
  const teammates: Teammate[] = [];
  room.state.players.forEach((p) => teammates.push({ characterId: p.characterId, connected: p.connected }));
  const iglCharacterId = room.state.iglCharacterId;
  const key = JSON.stringify([iglCharacterId, teammates]);
  if (key !== lastPublic) {
    lastPublic = key;
    session.update({ iglCharacterId, teammates });
  }
}, 250);
connect()
  .then((r) => {
    room = r;
    r.onMessage(MSG_PRIVATE_PROFILE, (profile: PrivateProfile) => session.update({ profile }));
    r.onMessage(MSG_KNOWLEDGE, (knowledge: KnownInfo[]) => session.update({ knowledge }));
    r.onMessage(MSG_EVIDENCE, (evidence: FoundEvidence[]) => {
      const before = session.get().evidence.length;
      const known = new Set(session.get().evidence.map((e) => e.item.id));
      const newPhoto = evidence.find((e) => e.item.kind === "photo" && !known.has(e.item.id));
      if (newPhoto && pendingThumb) {
        session.update({ photoThumbs: { ...session.get().photoThumbs, [newPhoto.item.id]: pendingThumb } });
        pendingThumb = undefined;
      }
      session.update({ evidence });
      const latest = evidence.at(-1);
      if (evidence.length > before && latest) setStatus(`Found: ${latest.item.title}`);
    });
    r.onMessage(MSG_BOARD, (board: Board) => session.update({ board }));
    r.onMessage(MSG_ABILITIES, (abilities: AbilityView[]) => session.update({ abilities }));
    r.onMessage(MSG_PHONE, (phone: PhoneMessage[]) => {
      if (phone.length > session.get().phone.length) setStatus("Your phone buzzes.");
      session.update({ phone });
    });
    if (import.meta.env.DEV) r.onMessage(MSG_DEBUG_STATE, (debugState: DebugCaseState) => session.update({ debugState }));
    r.onMessage(MSG_VANTA_NOTICE, (n: { text: string }) => session.update({ vantaNotice: n.text }));
    r.onMessage(MSG_DIALOGUE, (dialogue: DialogueView) => session.update({ dialogue: dialogue.ended ? undefined : dialogue }));
    r.send(MSG_REQUEST_PRIVATE_SYNC);
    setStatus(`room ${r.roomId} · invite: ${location.href}`);
    const self = r.state.players?.get(r.sessionId);
    if (self) {
      pos.x = self.x;
      pos.z = self.z;
    }
    r.onLeave((code) => setStatus(`disconnected (${code}) · reload within 20s to reconnect`));
  })
  .catch((err: unknown) => setStatus(`server: offline (${String(err)})`));

const pos: Vec2 = { x: 0, z: 8 };
let facing = yaw;
let rig: CameraPreset = CAMERA_PRESETS.explore;
let last = performance.now();
let seq = 0;
let captureNext = false;
let pendingThumb: string | undefined;

/** Small local thumbnail of the frame just rendered (only this player ever sees it). */
function captureThumb(): string | undefined {
  const c = document.createElement("canvas");
  c.width = 192;
  c.height = 108;
  const ctx = c.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(renderer.domElement, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.6);
}
let sendTimer = 0;

function syncNpcs(dt: number): void {
  if (!room?.state.npcs) return;
  const k = Math.min(1, dt * 10);
  room.state.npcs.forEach((n, id) => {
    let mesh = npcMeshes.get(id);
    if (!mesh) {
      mesh = createNpcMesh(n);
      mesh.position.set(n.x, 0, n.z);
      scene.add(mesh);
      npcMeshes.set(id, mesh);
    }
    mesh.position.x += (n.x - mesh.position.x) * k;
    mesh.position.z += (n.z - mesh.position.z) * k;
    mesh.rotation.y = n.facing;
    // Someone lying on the ground.
    mesh.rotation.z = n.down ? Math.PI / 2 : 0;
    mesh.position.y = n.down ? 0.35 : 0;
  });
}

function syncRemotes(dt: number): void {
  if (!room?.state.players) return;
  const seen = new Set<string>();
  room.state.players.forEach((p, id) => {
    if (id === room?.sessionId) {
      // Reconcile local prediction toward the authoritative position.
      const ex = p.x - pos.x;
      const ez = p.z - pos.z;
      if (Math.hypot(ex, ez) > 1.5) {
        pos.x = p.x;
        pos.z = p.z;
      } else {
        const k = Math.min(1, dt * 4);
        pos.x += ex * k;
        pos.z += ez * k;
      }
      return;
    }
    seen.add(id);
    let mesh = remotes.get(id);
    if (!mesh) {
      mesh = new THREE.Mesh(capsuleGeo, remoteMat);
      mesh.position.set(p.x, 0.9, p.z);
      scene.add(mesh);
      remotes.set(id, mesh);
    }
    mesh.material = p.connected ? remoteMat : disconnectedMat;
    const k = Math.min(1, dt * 12);
    mesh.position.x += (p.x - mesh.position.x) * k;
    mesh.position.z += (p.z - mesh.position.z) * k;
    mesh.rotation.y = p.facing;
  });
  for (const [id, mesh] of remotes) {
    if (!seen.has(id)) {
      scene.remove(mesh);
      remotes.delete(id);
    }
  }
}

renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const axis = input.moveAxis();
  const sprint = input.isHeld("sprint");
  const dir = worldDirection(axis, yaw);
  const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
  const cars = room?.state.vehicles ? [...room.state.vehicles.values()].map((v) => vehicleBox(v.x, v.z, v.heading)) : [];
  const next = moveWithCollision(pos, { x: dir.x * speed * dt, z: dir.z * speed * dt }, [...GREYBOX_WALLS, ...cars]);
  pos.x = next.x;
  pos.z = next.z;
  if (dir.x !== 0 || dir.z !== 0) facing = Math.atan2(-dir.x, -dir.z);

  sendTimer += dt;
  if (room && sendTimer >= 1 / TICK_RATE) {
    sendTimer = 0;
    const msg: InputMessage = { seq: ++seq, x: axis.x, y: axis.y, yaw, sprint };
    room.send(MSG_INPUT, msg);
  }
  syncRemotes(dt);
  syncNpcs(dt);
  if (room?.state.spots) syncSpots(scene, room.state.spots);
  if (room?.state.vehicles) syncVehicles(scene, room.state.vehicles);

  if (input.wasPressed("photo") && room && !session.get().dialogue) {
    room.send(MSG_TAKE_PHOTO, { yaw });
    captureNext = true;
    setStatus("Photo taken.");
  }

  if (import.meta.env.DEV && input.wasPressed("debug")) {
    const debugOpen = !session.get().debugOpen;
    session.update({ debugOpen });
    if (debugOpen && document.pointerLockElement) document.exitPointerLock();
  }

  if (input.wasPressed("toggleBoard")) {
    const boardOpen = !session.get().boardOpen;
    session.update({ boardOpen });
    if (boardOpen && document.pointerLockElement) document.exitPointerLock();
  }

  player.position.set(pos.x, 0.9, pos.z);
  player.rotation.y = facing;

  const people = room?.state.npcs ? npcInteractables(room.state.npcs.values()) : [];
  const spots = room?.state.spots ? spotInteractables(room.state.spots.values()) : [];
  const carTargets = room?.state.vehicles ? vehicleInteractables(room.state.vehicles.values()) : [];
  const target = findInteractable(pos, facing, [...spots, ...people, ...carTargets]);
  if (prompt) prompt.textContent = target && !session.get().dialogue ? `[E] ${target.label}` : "";
  const dialogue = session.get().dialogue;
  if (dialogue) {
    // Walking away ends the conversation.
    const other = room?.state.npcs.get(dialogue.npcId) ?? room?.state.vehicles.get(dialogue.npcId) ?? room?.state.spots.get(dialogue.npcId);
    if (!other || Math.hypot(other.x - pos.x, other.z - pos.z) > 4.5) leaveTalk();
    (["choice1", "choice2", "choice3", "choice4"] as const).forEach((a, i) => {
      const option = dialogue.options[i];
      if (option && input.wasPressed(a)) room?.send(MSG_TALK_CHOICE, { optionId: option.id });
    });
  } else if (target && input.wasPressed("interact")) {
    if (room?.state.npcs.has(target.id) || room?.state.vehicles.has(target.id)) {
      room.send(MSG_TALK, { npcId: target.id });
      if (document.pointerLockElement) document.exitPointerLock();
    } else room?.send(MSG_INTERACT, { targetId: target.id });
  }

  const mode = resolveMode(input.isHeld("aim"), input.isHeld("investigate"));
  rig = lerpPreset(rig, CAMERA_PRESETS[mode], Math.min(1, dt * 8));
  const flat = Math.cos(pitch) * rig.distance;
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const head = { x: pos.x + right.x * rig.shoulder, z: pos.z + right.z * rig.shoulder };
  const camY = rig.height + Math.sin(pitch) * rig.distance;
  const desired = { x: head.x + Math.sin(yaw) * flat, z: head.z + Math.cos(yaw) * flat };
  const clear = clearCameraFraction(head, 1.4, desired, camY, GREYBOX_WALLS);
  camera.position.set(head.x + (desired.x - head.x) * clear, 1.4 + (camY - 1.4) * clear, head.z + (desired.z - head.z) * clear);
  // With the camera pushed right up behind the character (back to a wall), fade the character out.
  const camDist = Math.hypot(camera.position.x - pos.x, camera.position.z - pos.z);
  playerMat.opacity = Math.min(1, Math.max(0.15, (camDist - 0.6) / 1.2));
  camera.lookAt(pos.x + right.x * rig.shoulder, 1.4, pos.z + right.z * rig.shoulder);
  camera.fov = rig.fov;
  camera.updateProjectionMatrix();

  input.endFrame();
  renderer.render(scene, camera);
  if (captureNext) {
    // Read the canvas right after rendering, before the buffer is cleared.
    pendingThumb = captureThumb();
    captureNext = false;
  }
});

document.title = GAME_NAME;
