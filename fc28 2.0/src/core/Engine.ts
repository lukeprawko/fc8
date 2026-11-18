/**
 * CYBERFC 28 — Main Game Engine
 * Orchestrates Three.js rendering, 3D physics, MatchManager, PlayerEntities, and UI.
 */

import * as THREE from 'three';
import { Renderer } from '../rendering/Renderer';
import { Pitch } from '../stadium/Pitch';
import { BallPhysics } from '../physics/BallPhysics';
import { GameLoop } from './GameLoop';
import { PlayerEntity } from '../players/PlayerEntity';
import { squadManager } from '../ultimate-team/SquadManager';
import { getCardById, STARTER_CARD_IDS } from '../ultimate-team/CardDatabase';
import { events } from './EventBus';

export class Engine {
  public renderer: Renderer;
  public pitch: Pitch;
  public ball: BallPhysics;
  public gameLoop: GameLoop;

  public blueTeam: PlayerEntity[] = [];
  public redTeam: PlayerEntity[] = [];
  public controlledPlayer: PlayerEntity | null = null;

  // 3D Ball visual mesh
  private ballMesh: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.pitch = new Pitch();
    this.renderer.scene.add(this.pitch.group);

    this.ball = new BallPhysics();
    this.gameLoop = new GameLoop();

    // Create 3D soccer ball mesh
    const ballGeo = new THREE.SphereGeometry(this.ball.radius, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.renderer.scene.add(this.ballMesh);

    this.setupTeams();
    this.setupGameLoop();
  }

  private setupTeams(): void {
    const club = squadManager.getClubData();
    const roles: ('GK' | 'DEF' | 'MID' | 'FWD')[] = ['GK', 'DEF', 'MID', 'FWD'];

    // Blue Team (Human User Team)
    const blueCoords = [
      new THREE.Vector3(-45, 0, 0),   // GK
      new THREE.Vector3(-25, 0, 0),   // DEF
      new THREE.Vector3(-10, 0, 0),   // MID
      new THREE.Vector3(0, 0, 0)      // FWD
    ];

    roles.forEach((r, idx) => {
      const cardId = club.lineup[r] || STARTER_CARD_IDS[idx];
      const card = getCardById(cardId) || getCardById(STARTER_CARD_IDS[idx])!;
      const player = new PlayerEntity(card, 'blue', blueCoords[idx]);
      this.blueTeam.push(player);
      this.renderer.scene.add(player.model.group);
    });

    // Red Team (Opponent Team)
    const redCoords = [
      new THREE.Vector3(45, 0, 0),    // GK
      new THREE.Vector3(25, 0, 0),    // DEF
      new THREE.Vector3(10, 0, 0),    // MID
      new THREE.Vector3(2, 0, 0)      // FWD
    ];

    roles.forEach((r, idx) => {
      const cardId = STARTER_CARD_IDS[idx];
      const card = getCardById(cardId)!;
      const player = new PlayerEntity(card, 'red', redCoords[idx]);
      this.redTeam.push(player);
      this.renderer.scene.add(player.model.group);
    });

    // Default control striker or closest to ball
    this.switchPlayerToClosest();
  }

  public switchPlayerToClosest(): void {
    const activeCandidates = this.blueTeam.filter(p => !p.sentOff);
    if (activeCandidates.length === 0) return;

    const sorted = [...activeCandidates].sort((a, b) => {
      const distA = Math.hypot(a.position.x - this.ball.position.x, a.position.z - this.ball.position.y);
      const distB = Math.hypot(b.position.x - this.ball.position.x, b.position.z - this.ball.position.y);
      return distA - distB;
    });

    let target = sorted[0];
    if (target === this.controlledPlayer && sorted.length > 1) {
      target = sorted[1];
    }

    if (this.controlledPlayer) this.controlledPlayer.isControlled = false;
    this.controlledPlayer = target;
    this.controlledPlayer.isControlled = true;

    events.emit('playerControlled', this.controlledPlayer.card.name);
  }

  private setupGameLoop(): void {
    this.gameLoop.onTick = (dt: number) => {
      // 1. Update ball physics
      this.ball.update(dt);
      this.ballMesh.position.set(this.ball.position.x, this.ball.position.z + this.ball.radius, this.ball.position.y);

      // 2. Update players
      [...this.blueTeam, ...this.redTeam].forEach(p => p.update(dt, this.ball));

      // 3. Camera tracks ball
      this.renderer.cameraController.update(
        { x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z },
        dt
      );
    };

    this.gameLoop.onRender = (_alpha: number) => {
      this.renderer.render();
    };
  }

  public start(): void {
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }
}
