/**
 * CYBERFC 28 — WebGL Renderer & Scene Lighting
 * Configures Three.js WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping, and stadium floodlights.
 */

import * as THREE from 'three';
import { CameraController } from './CameraController';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public cameraController: CameraController;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060910);
    this.scene.fog = new THREE.FogExp2(0x060910, 0.0035);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.cameraController = new CameraController((canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight));

    this.setupLighting();
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);

    // Main stadium directional light (Floodlight 1)
    const floodlight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    floodlight1.position.set(40, 60, 30);
    floodlight1.castShadow = true;
    floodlight1.shadow.mapSize.width = 2048;
    floodlight1.shadow.mapSize.height = 2048;
    floodlight1.shadow.camera.near = 10;
    floodlight1.shadow.camera.far = 160;
    floodlight1.shadow.camera.left = -60;
    floodlight1.shadow.camera.right = 60;
    floodlight1.shadow.camera.top = 45;
    floodlight1.shadow.camera.bottom = -45;
    floodlight1.shadow.bias = -0.0005;
    this.scene.add(floodlight1);

    // Opposite stadium floodlight (Floodlight 2)
    const floodlight2 = new THREE.DirectionalLight(0x8bc34a, 0.55);
    floodlight2.position.set(-40, 50, -30);
    this.scene.add(floodlight2);

    // Blue & Red cyber stadium accent lights
    const blueSpot = new THREE.PointLight(0x00f0ff, 2.0, 80);
    blueSpot.position.set(-52, 12, 0);
    this.scene.add(blueSpot);

    const redSpot = new THREE.PointLight(0xff0055, 2.0, 80);
    redSpot.position.set(52, 12, 0);
    this.scene.add(redSpot);
  }

  public render(): void {
    this.renderer.render(this.scene, this.cameraController.camera);
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.cameraController.resize(width, height);
  }
}
