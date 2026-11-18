/**
 * CYBERFC 28 — Broadcast TV Dynamic Camera Controller
 * Smooth ball tracking, dynamic zoom on action, and goal / power shot screen shake.
 */

import * as THREE from 'three';

export interface CameraTarget {
  x: number;
  y: number;
  z: number;
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public currentPosition: THREE.Vector3 = new THREE.Vector3(0, 32, 42);
  public shakeAmount: number = 0;
  public fov: number = 42;

  // Camera settings
  public height: number = 30;
  public distance: number = 40;
  public smoothSpeed: number = 0.08;

  constructor(aspectRatio: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(this.fov, aspectRatio, 0.1, 1000);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.target);
  }

  public update(targetPos: CameraTarget, dt: number): void {
    // Smooth target tracking with damping
    const targetX = targetPos.x * 0.75; // Slight bias towards center
    const targetZ = targetPos.y * 0.45; // Match pitch coordinates

    this.target.x += (targetX - this.target.x) * this.smoothSpeed;
    this.target.z += (targetZ - this.target.z) * this.smoothSpeed;

    const desiredX = this.target.x;
    const desiredY = this.height;
    const desiredZ = this.target.z + this.distance;

    this.currentPosition.x += (desiredX - this.currentPosition.x) * this.smoothSpeed;
    this.currentPosition.y += (desiredY - this.currentPosition.y) * this.smoothSpeed;
    this.currentPosition.z += (desiredZ - this.currentPosition.z) * this.smoothSpeed;

    // Apply screen shake
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.shakeAmount > 0) {
      shakeOffsetX = (Math.random() - 0.5) * this.shakeAmount;
      shakeOffsetY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 14);
    }

    this.camera.position.set(
      this.currentPosition.x + shakeOffsetX,
      this.currentPosition.y + shakeOffsetY,
      this.currentPosition.z
    );

    this.camera.lookAt(this.target);
  }

  public triggerShake(intensity: number = 1.5): void {
    this.shakeAmount = intensity;
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
