/**
 * @file ThreeEngine.ts
 * @description Pełny silnik renderowania 3D (Three.js): murawa z pasami, linie boiska, bramki 3D, piłka, modele graczy i dynamiczna kamera
 */

import * as THREE from 'three';
import { GAME_CONSTANTS } from '@games/shared';
import { InterpolatedState } from '../net/GameClient';

export class ThreeEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private ballMesh: THREE.Mesh;
  private ballLight: THREE.PointLight;
  private playerMeshes: THREE.Group[] = [];
  private activePlayerRing: THREE.Mesh;

  private camX = GAME_CONSTANTS.WORLD_WIDTH / 2;
  private camZ = GAME_CONSTANTS.WORLD_HEIGHT / 2;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.Fog(0x0a101d, 2800, 7500);

    // 2. Kamera z perspektywą telewizyjną (Ground na osi XZ, Y w górę)
    const aspect = Math.max(0.1, container.clientWidth / (container.clientHeight || 1));
    this.camera = new THREE.PerspectiveCamera(40, aspect, 10, 8000);
    this.camera.position.set(this.camX, 900, this.camZ + 750);
    this.camera.lookAt(this.camX, 0, this.camZ - 30);

    // 3. Renderer WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Oświetlenie stadionu
    this.setupLighting();

    // 5. Murawa z liniami i otoczeniem
    this.buildPitch();

    // 6. Bandy reklamowe i bramki
    this.buildStadium();

    // 7. Piłka 3D
    const ballGeo = new THREE.SphereGeometry(16, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.1
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, 16, GAME_CONSTANTS.WORLD_HEIGHT / 2);
    this.scene.add(this.ballMesh);

    this.ballLight = new THREE.PointLight(0x00f0ff, 0, 300);
    this.scene.add(this.ballLight);

    // 8. Pierścień aktywnego gracza
    const ringGeo = new THREE.RingGeometry(20, 25, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e676, side: THREE.DoubleSide });
    this.activePlayerRing = new THREE.Mesh(ringGeo, ringMat);
    this.activePlayerRing.rotation.x = -Math.PI / 2;
    this.activePlayerRing.position.y = 1;
    this.activePlayerRing.visible = false;
    this.scene.add(this.activePlayerRing);

    // 9. Modele zawodników 3D
    this.initPlayerMeshes();

    window.addEventListener('resize', this.onResize);

    // Pierwsze natychmiastowe wyrenderowanie sceny
    this.renderDefaultScene();
  }

  private setupLighting(): void {
    const cx = GAME_CONSTANTS.WORLD_WIDTH / 2;
    const cz = GAME_CONSTANTS.WORLD_HEIGHT / 2;

    // Światło otoczenia - zapewnia czytelną widoczność boiska w każdych warunkach
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    // Światło hemisferyczne
    const hemi = new THREE.HemisphereLight(0xdaf0ff, 0x1e3b20, 0.85);
    this.scene.add(hemi);

    // Światło główne (słoneczne / jupiter)
    const sun = new THREE.DirectionalLight(0xfffaed, 1.3);
    sun.position.set(cx - 400, 1200, cz + 600);
    sun.target.position.set(cx, 0, cz);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 3200;
    sun.shadow.camera.left = -1500;
    sun.shadow.camera.right = 1500;
    sun.shadow.camera.top = 1000;
    sun.shadow.camera.bottom = -1000;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(sun.target);

    // Reflektory neonowe Cyberpunk
    const cyanLight = new THREE.SpotLight(0x00f0ff, 2.5, 2500, Math.PI / 4, 0.4);
    cyanLight.position.set(200, 700, 200);
    this.scene.add(cyanLight);

    const pinkLight = new THREE.SpotLight(0xff0055, 2.5, 2500, Math.PI / 4, 0.4);
    pinkLight.position.set(GAME_CONSTANTS.WORLD_WIDTH - 200, 700, GAME_CONSTANTS.WORLD_HEIGHT - 200);
    this.scene.add(pinkLight);
  }

  private buildPitch(): void {
    const pw = GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X * 2;
    const ph = GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y * 2;

    // Generowanie tekstury murawy z pasami i liniami kredowymi
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1140;
    const g = canvas.getContext('2d')!;

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / pw;
    const sy = h / ph;

    // Pasy trawy
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 === 0 ? '#276d2d' : '#2f7d34';
      g.fillRect((i * w) / 16, 0, w / 16 + 1, h);
    }

    // Linie kredowe
    g.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    g.fillStyle = '#ffffff';
    g.lineWidth = 6;

    // Obrys główny
    g.strokeRect(0, 0, w, h);

    // Linia środkowa i koło środkowe
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();

    g.beginPath();
    g.ellipse(w / 2, h / 2, 115 * sx, 115 * sy, 0, 0, 2 * Math.PI);
    g.stroke();

    // Pola karne
    g.strokeRect(0, (h / 2) - 210 * sy, 210 * sx, 420 * sy);
    g.strokeRect(w - 210 * sx, (h / 2) - 210 * sy, 210 * sx, 420 * sy);

    // Pola bramkowe
    g.strokeRect(0, (h / 2) - 120 * sy, 75 * sx, 240 * sy);
    g.strokeRect(w - 75 * sx, (h / 2) - 120 * sy, 75 * sx, 240 * sy);

    // Punkty karne
    g.beginPath(); g.arc(140 * sx, h / 2, 6, 0, 7); g.fill();
    g.beginPath(); g.arc(w - 140 * sx, h / 2, 6, 0, 7); g.fill();
    g.beginPath(); g.arc(w / 2, h / 2, 6, 0, 7); g.fill();

    const pitchTex = new THREE.CanvasTexture(canvas);
    pitchTex.colorSpace = THREE.SRGBColorSpace;

    // Murawa
    const pitchGeo = new THREE.PlaneGeometry(pw, ph);
    const pitchMat = new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.9, side: THREE.DoubleSide });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.rotation.x = -Math.PI / 2;
    pitchMesh.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, 0, GAME_CONSTANTS.WORLD_HEIGHT / 2);
    pitchMesh.receiveShadow = true;
    this.scene.add(pitchMesh);

    // Otoczenie boiska (apron)
    const apronGeo = new THREE.PlaneGeometry(6000, 5000);
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x1a4620, roughness: 1.0, side: THREE.DoubleSide });
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.rotation.x = -Math.PI / 2;
    apronMesh.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, -0.5, GAME_CONSTANTS.WORLD_HEIGHT / 2);
    apronMesh.receiveShadow = true;
    this.scene.add(apronMesh);
  }

  private buildStadium(): void {
    const pw = GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X * 2;
    const ph = GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y * 2;
    const cx = GAME_CONSTANTS.WORLD_WIDTH / 2;
    const cz = GAME_CONSTANTS.WORLD_HEIGHT / 2;

    // Bandy reklamowe
    this.createBoard(cx, cz - ph / 2 - 16, pw + 50, 0);
    this.createBoard(cx, cz + ph / 2 + 16, pw + 50, 0);

    // Bramki 3D
    this.createGoal(GAME_CONSTANTS.MARGIN_X, cz, true);
    this.createGoal(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X, cz, false);
  }

  private createBoard(x: number, z: number, len: number, rotY: number): void {
    const bGeo = new THREE.BoxGeometry(len, 12, 4);
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x081020,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.45,
      roughness: 0.4
    });
    const mesh = new THREE.Mesh(bGeo, bMat);
    mesh.position.set(x, 6, z);
    mesh.rotation.y = rotY;
    this.scene.add(mesh);
  }

  private createGoal(x: number, z: number, isLeft: boolean): void {
    const goalH = GAME_CONSTANTS.GOAL_HEIGHT;
    const goalZ = 120;
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.7 });
    const postGeo = new THREE.CylinderGeometry(4, 4, goalZ, 16);

    const group = new THREE.Group();

    // Słupki
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(0, goalZ / 2, -goalH / 2);
    group.add(p1);

    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(0, goalZ / 2, goalH / 2);
    group.add(p2);

    // Poprzeczka
    const crossGeo = new THREE.CylinderGeometry(4, 4, goalH, 16);
    const cross = new THREE.Mesh(crossGeo, postMat);
    cross.rotation.x = Math.PI / 2;
    cross.position.set(0, goalZ, 0);
    group.add(cross);

    // Siatka bramki
    const netGeo = new THREE.BoxGeometry(45, goalZ, goalH);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(isLeft ? -22 : 22, goalZ / 2, 0);
    group.add(net);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private initPlayerMeshes(): void {
    for (let i = 0; i < 8; i++) {
      const isBlue = i < 4;
      const group = new THREE.Group();

      // Tułów z koszulką
      const bodyGeo = new THREE.CylinderGeometry(11, 8, 38, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isBlue ? 0x00f0ff : 0xff0055,
        roughness: 0.35,
        emissive: isBlue ? 0x00f0ff : 0xff0055,
        emissiveIntensity: 0.15
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 26;
      body.castShadow = true;
      group.add(body);

      // Głowa
      const headGeo = new THREE.SphereGeometry(8, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 50;
      head.castShadow = true;
      group.add(head);

      // Neonowy pierścień pod zawodnikiem
      const ringGeo = new THREE.RingGeometry(13, 16, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isBlue ? 0x00f0ff : 0xff0055,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      group.add(ring);

      this.scene.add(group);
      this.playerMeshes.push(group);
    }
  }

  /**
   * Renderuje domyślne ustawienie początkowe (widoczne natychmiast bez czekania na serwer)
   */
  public renderDefaultScene(): void {
    const cx = GAME_CONSTANTS.WORLD_WIDTH / 2;
    const cz = GAME_CONSTANTS.WORLD_HEIGHT / 2;

    this.ballMesh.position.set(cx, 16, cz);

    // Ustawienie niebieskich
    for (let i = 0; i < 4; i++) {
      const m = this.playerMeshes[i];
      if (m) m.position.set(280 + i * 220, 0, cz + (i % 2 === 0 ? -40 : 40));
    }

    // Ustawienie czerwonych
    for (let i = 0; i < 4; i++) {
      const m = this.playerMeshes[4 + i];
      if (m) m.position.set(GAME_CONSTANTS.WORLD_WIDTH - (280 + i * 220), 0, cz + (i % 2 === 0 ? -40 : 40));
    }

    this.camera.position.set(cx, 900, cz + 750);
    this.camera.lookAt(cx, 0, cz - 30);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Renderowanie klatki na podstawie stanu gry
   */
  public render(state: InterpolatedState | null, localSlot = 0): void {
    if (!state) {
      this.renderDefaultScene();
      return;
    }

    // 1. Aktualizacja pozycji piłki (X na osi X, Y na osi Z, Z na osi Y)
    this.ballMesh.position.set(state.ball.x, 16 + (state.ball.z || 0), state.ball.y);
    this.ballMesh.rotation.x += (state.ball.vx || 0) * 0.04;
    this.ballMesh.rotation.z += (state.ball.vy || 0) * 0.04;

    if (state.ball.isPower) {
      this.ballLight.intensity = 2.5;
      this.ballLight.position.copy(this.ballMesh.position);
    } else {
      this.ballLight.intensity = 0;
    }

    // 2. Aktualizacja pozycji graczy
    state.players.forEach((p, idx) => {
      const mesh = this.playerMeshes[idx];
      if (mesh) {
        mesh.position.set(p.x, 0, p.y);
        mesh.rotation.y = -p.angle + Math.PI / 2;
      }
    });

    // 3. Pierścień aktywnego gracza
    if (localSlot >= 0 && localSlot < state.players.length) {
      const p = state.players[localSlot];
      this.activePlayerRing.visible = true;
      this.activePlayerRing.position.set(p.x, 1, p.y);
    } else {
      this.activePlayerRing.visible = false;
    }

    // 4. Dynamiczna kamera śledząca piłkę i akcję
    const targetX = state.ball.x + (state.ball.vx || 0) * 8;
    const targetZ = state.ball.y;
    this.camX += (targetX - this.camX) * 0.06;
    this.camZ += (targetZ - this.camZ) * 0.06;

    this.camera.position.set(this.camX, 900, this.camZ + 750);
    this.camera.lookAt(this.camX, 0, this.camZ - 30);

    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = Math.max(0.1, width / height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
