import * as THREE from "three";
import {
  GAME_NAME,
  GREYBOX_WALLS,
  MSG_INPUT,
  MSG_KNOWLEDGE,
  MSG_PRIVATE_PROFILE,
  MSG_REQUEST_PRIVATE_SYNC,
  MSG_SHARE_ITEM,
  SPRINT_SPEED,
  TICK_RATE,
  WALK_SPEED,
  moveWithCollision,
  worldDirection,
  type GameState,
  type InputMessage,
  type KnownInfo,
  type PrivateProfile,
  type ShareRequest,
  type Vec2,
} from "@vanta/shared";
import type { Room } from "colyseus.js";
import { ActionMap } from "./engine/actionMap";
import { CAMERA_PRESETS, clampPitch, lerpPreset, resolveMode, type CameraPreset } from "./engine/cameraRig";
import { buildGreybox } from "./game/greybox";
import { createNpcMesh } from "./game/npcView";
import { npcInteractables, observationText } from "./game/observe";
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
const player = new THREE.Mesh(capsuleGeo, new THREE.MeshStandardMaterial({ color: 0x6f8aa3 }));
scene.add(player);
const remoteMat = new THREE.MeshStandardMaterial({ color: 0xa36f6f });
const disconnectedMat = new THREE.MeshStandardMaterial({ color: 0xa36f6f, transparent: true, opacity: 0.3 });
const remotes = new Map<string, THREE.Mesh>();
const npcMeshes = new Map<string, THREE.Group>();

const input = new ActionMap();
addEventListener("keydown", (e) => input.press(e.code));
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
mountOverlay(document.getElementById("ui"), session, (itemId, toCharacterIds) => {
  const req: ShareRequest = { itemId, toCharacterIds };
  room?.send(MSG_SHARE_ITEM, req);
});

// Public room state -> overlay (IGL designation, teammate list), polled at low rate.
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
  const next = moveWithCollision(pos, { x: dir.x * speed * dt, z: dir.z * speed * dt }, GREYBOX_WALLS);
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

  player.position.set(pos.x, 0.9, pos.z);
  player.rotation.y = facing;

  const people = room?.state.npcs ? npcInteractables(room.state.npcs.values()) : [];
  const target = findInteractable(pos, facing, [...greybox.interactables, ...people]);
  if (prompt) prompt.textContent = target ? `[E] ${target.label}` : "";
  if (target && input.wasPressed("interact")) {
    const person = room?.state.npcs.get(target.id);
    setStatus(person ? observationText(person) : `interacted: ${target.kind} ${target.id}`);
  }

  const mode = resolveMode(input.isHeld("aim"), input.isHeld("investigate"));
  rig = lerpPreset(rig, CAMERA_PRESETS[mode], Math.min(1, dt * 8));
  const flat = Math.cos(pitch) * rig.distance;
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  camera.position.set(
    pos.x + Math.sin(yaw) * flat + right.x * rig.shoulder,
    rig.height + Math.sin(pitch) * rig.distance,
    pos.z + Math.cos(yaw) * flat + right.z * rig.shoulder,
  );
  camera.lookAt(pos.x + right.x * rig.shoulder, 1.4, pos.z + right.z * rig.shoulder);
  camera.fov = rig.fov;
  camera.updateProjectionMatrix();

  input.endFrame();
  renderer.render(scene, camera);
});

document.title = GAME_NAME;
