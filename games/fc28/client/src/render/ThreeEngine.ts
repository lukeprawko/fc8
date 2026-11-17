/**
 * @file ThreeEngine.ts
 * @description Silnik renderowania 3D oparty na Three.js: boisko, piłka, modele graczy, oświetlenie i kamera
 */

import * as THREE from 'three';
import { GAME_CONSTANTS } from '@games/shared';
import { InterpolatedState } from '../net/GameClient';

export class ThreeEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Obiekty sceny
  private ballMesh: THREE.Mesh;
  private ballLight: THREE.PointLight;
  private playerMeshes: THREE.Group[] = [];
  private activePlayerRing: THREE.Mesh;

  private isRunning = false;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Scena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060c);
    this.scene.fog = new THREE.FogExp2(0x04060c, 0.00045);

    // 2. Kamera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 10, 5000);
    this.camera.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, -650, 950);
    this.camera.lookAt(GAME_CONSTANTS.WORLD_WIDTH / 2, GAME_CONSTANTS.WORLD_HEIGHT / 2, 0);

    // 3. Renderer WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 4. Oświetlenie
    this.setupLighting();

    // 5. Budowa boiska i bramek
    this.buildPitch();

    // 6. Piłka
    const ballGeo = new THREE.SphereGeometry(16, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.1
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    this.ballLight = new THREE.PointLight(0x00f0ff, 0, 300);
    this.scene.add(this.ballLight);

    // 7. Znacznik aktywnego gracza
    const ringGeo = new THREE.RingGeometry(22, 26, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    this.activePlayerRing = new THREE.Mesh(ringGeo, ringMat);
    this.activePlayerRing.visible = false;
    this.scene.add(this.activePlayerRing);

    // 8. Inicjalizacja modeli graczy
    this.initPlayerMeshes();

    window.addEventListener('resize', this.onResize);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, -400, 1200);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 3000;
    sun.shadow.camera.left = -1400;
    sun.shadow.camera.right = 1400;
    sun.shadow.camera.top = 900;
    sun.shadow.camera.bottom = -900;
    this.scene.add(sun);

    // Cyberpunkowe reflektory stadionowe
    const cyanSpot = new THREE.SpotLight(0x00f0ff, 2, 2000, Math.PI / 4, 0.4);
    cyanSpot.position.set(0, 0, 800);
    this.scene.add(cyanSpot);

    const pinkSpot = new THREE.SpotLight(0xff0055, 2, 2000, Math.PI / 4, 0.4);
    pinkSpot.position.set(GAME_CONSTANTS.WORLD_WIDTH, 0, 800);
    this.scene.add(pinkSpot);
  }

  private buildPitch(): void {
    // Płyta boiska
    const pitchGeo = new THREE.PlaneGeometry(GAME_CONSTANTS.WORLD_WIDTH, GAME_CONSTANTS.WORLD_HEIGHT);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0x0a1912,
      roughness: 0.85,
      metalness: 0.1
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(GAME_CONSTANTS.WORLD_WIDTH / 2, GAME_CONSTANTS.WORLD_HEIGHT / 2, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Linie boiska
    const linesMat = new THREE.LineBasicMaterial({ color: 0x38ef7d, linewidth: 2 });
    const points = [
      new THREE.Vector3(GAME_CONSTANTS.MARGIN_X, GAME_CONSTANTS.MARGIN_Y, 1),
      new THREE.Vector3(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X, GAME_CONSTANTS.MARGIN_Y, 1),
      new THREE.Vector3(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X, GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y, 1),
      new THREE.Vector3(GAME_CONSTANTS.MARGIN_X, GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y, 1),
      new THREE.Vector3(GAME_CONSTANTS.MARGIN_X, GAME_CONSTANTS.MARGIN_Y, 1),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(points);
    const borderLine = new THREE.Line(borderGeo, linesMat);
    this.scene.add(borderLine);

    // Linia środkowa
    const midPoints = [
      new THREE.Vector3(GAME_CONSTANTS.WORLD_WIDTH / 2, GAME_CONSTANTS.MARGIN_Y, 1),
      new THREE.Vector3(GAME_CONSTANTS.WORLD_WIDTH / 2, GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.MARGIN_Y, 1)
    ];
    const midGeo = new THREE.BufferGeometry().setFromPoints(midPoints);
    const midLine = new THREE.Line(midGeo, linesMat);
    this.scene.add(midLine);

    // Koło środkowe
    const circleCurve = new THREE.EllipseCurve(
      GAME_CONSTANTS.WORLD_WIDTH / 2, GAME_CONSTANTS.WORLD_HEIGHT / 2,
      170, 170, 0, 2 * Math.PI, false, 0
    );
    const circlePoints = circleCurve.getPoints(64).map(p => new THREE.Vector3(p.x, p.y, 1));
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circleLine = new THREE.Line(circleGeo, linesMat);
    this.scene.add(circleLine);

    // Bramki 3D
    this.buildGoal(GAME_CONSTANTS.MARGIN_X, true);
    this.buildGoal(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.MARGIN_X, false);
  }

  private buildGoal(xPos: number, isLeft: boolean): void {
    const goalH = GAME_CONSTANTS.GOAL_HEIGHT;
    const goalW = GAME_CONSTANTS.GOAL_WIDTH;
    const goalZ = 120;
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });

    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(4, 4, goalZ, 16);

    // Słupki pionowe
    const p1 = new THREE.Mesh(postGeo, goalMat);
    p1.rotation.x = Math.PI / 2;
    p1.position.set(0, -goalH / 2, goalZ / 2);
    group.add(p1);

    const p2 = new THREE.Mesh(postGeo, goalMat);
    p2.rotation.x = Math.PI / 2;
    p2.position.set(0, goalH / 2, goalZ / 2);
    group.add(p2);

    // Poprzeczka
    const barGeo = new THREE.CylinderGeometry(4, 4, goalH, 16);
    const bar = new THREE.Mesh(barGeo, goalMat);
    bar.position.set(0, 0, goalZ);
    group.add(bar);

    group.position.set(xPos, GAME_CONSTANTS.WORLD_HEIGHT / 2, 0);
    this.scene.add(group);
  }

  private initPlayerMeshes(): void {
    for (let i = 0; i < 8; i++) {
      const isBlue = i < 4;
      const group = new THREE.Group();

      // Tułów
      const bodyGeo = new THREE.CylinderGeometry(11, 8, 38, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isBlue ? 0x00f0ff : 0xff0055,
        roughness: 0.4,
        metalness: 0.3
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      body.position.z = 24;
      body.castShadow = true;
      group.add(body);

      // Głowa
      const headGeo = new THREE.SphereGeometry(8, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.z = 46;
      head.castShadow = true;
      group.add(head);

      // Podstawa z poświatą neonową
      const baseGeo = new THREE.CircleGeometry(16, 24);
      const baseMat = new THREE.MeshBasicMaterial({
        color: isBlue ? 0x00f0ff : 0xff0055,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.z = 0.5;
      group.add(base);

      this.scene.add(group);
      this.playerMeshes.push(group);
    }
  }

  /**
   * Renderowanie klatki na podstawie stanu interpolowanego
   */
  public render(state: InterpolatedState, localControlledIndex = -1): void {
    // 1. Pozycja piłki
    this.ballMesh.position.set(state.ball.x, state.ball.y, state.ball.z + 16);
    this.ballMesh.rotation.x += state.ball.vx * 0.04;
    this.ballMesh.rotation.y += state.ball.vy * 0.04;

    if (state.ball.isPower) {
      this.ballLight.intensity = 2.0;
      this.ballLight.position.copy(this.ballMesh.position);
    } else {
      this.ballLight.intensity = 0;
    }

    // 2. Pozycje zawodników
    state.players.forEach((p, idx) => {
      const mesh = this.playerMeshes[idx];
      if (mesh) {
        mesh.position.set(p.x, p.y, 0);
        mesh.rotation.z = p.angle;
      }
    });

    // 3. Wskaźnik sterowanego gracza
    if (localControlledIndex >= 0 && localControlledIndex < state.players.length) {
      const activeP = state.players[localControlledIndex];
      this.activePlayerRing.visible = true;
      this.activePlayerRing.position.set(activeP.x, activeP.y, 1);
    } else {
      this.activePlayerRing.visible = false;
    }

    // 4. Dynamiczna kamera śledząca akcję
    const targetCamX = state.ball.x + state.ball.vx * 8;
    const targetCamY = state.ball.y - 500;
    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.06;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.06;
    this.camera.lookAt(state.ball.x, state.ball.y, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
