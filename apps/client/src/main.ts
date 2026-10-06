import * as THREE from "three";
import { DEFAULT_SERVER_PORT, GAME_NAME } from "@vanta/shared";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 10, 40);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(4, 3, 6);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8fa3b5, 0x1a1d22, 1.2));
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x20252b }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x6f8aa3 }),
);
box.position.y = 0.5;
scene.add(box);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop((t) => {
  box.rotation.y = t / 2000;
  renderer.render(scene, camera);
});

document.title = GAME_NAME;
const status = document.getElementById("status");
fetch(`http://${location.hostname}:${DEFAULT_SERVER_PORT}/health`)
  .then((r) => r.json())
  .then((j: { ok: boolean }) => status && (status.textContent = `server: ${j.ok ? "ok" : "error"}`))
  .catch(() => status && (status.textContent = "server: offline"));
