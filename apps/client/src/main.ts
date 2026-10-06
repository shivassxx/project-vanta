import * as THREE from "three";
import { DEFAULT_SERVER_PORT, GAME_NAME } from "@vanta/shared";
import { ActionMap } from "./engine/actionMap";
import { CAMERA_PRESETS, clampPitch, lerpPreset, resolveMode, type CameraPreset } from "./engine/cameraRig";
import { buildGreybox } from "./game/greybox";
import { findInteractable } from "./game/interaction";
import { moveWithCollision, SPRINT_SPEED, WALK_SPEED, worldDirection, type Vec2 } from "./game/movement";

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

// Placeholder character: capsule.
const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 1.1, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x6f8aa3 }),
);
scene.add(player);

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

const pos: Vec2 = { x: 0, z: 8 };
let facing = yaw;
let rig: CameraPreset = CAMERA_PRESETS.explore;
let last = performance.now();

renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const dir = worldDirection(input.moveAxis(), yaw);
  const speed = input.isHeld("sprint") ? SPRINT_SPEED : WALK_SPEED;
  const next = moveWithCollision(pos, { x: dir.x * speed * dt, z: dir.z * speed * dt }, greybox.colliders);
  pos.x = next.x;
  pos.z = next.z;
  if (dir.x !== 0 || dir.z !== 0) facing = Math.atan2(-dir.x, -dir.z);
  player.position.set(pos.x, 0.9, pos.z);
  player.rotation.y = facing;

  const target = findInteractable(pos, facing, greybox.interactables);
  if (prompt) prompt.textContent = target ? `[E] ${target.label}` : "";
  if (target && input.wasPressed("interact") && status) status.textContent = `interacted: ${target.kind} ${target.id}`;

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
fetch(`http://${location.hostname}:${DEFAULT_SERVER_PORT}/health`)
  .then((r) => r.json())
  .then((j: { ok: boolean }) => status && (status.textContent = `server: ${j.ok ? "ok" : "error"}`))
  .catch(() => status && (status.textContent = "server: offline"));
