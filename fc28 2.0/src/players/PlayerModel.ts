/**
 * CYBERFC 28 — Procedural & Skeletal 3D Player Mesh Generator
 * Assembles fully rigged footballer meshes with team kits, numbers, skin tones, and running kinematics.
 */

import * as THREE from 'three';
import { PlayerCard } from '../ultimate-team/PlayerCard';

export class PlayerModel {
  public group: THREE.Group;
  public torso: THREE.Mesh;
  public head: THREE.Mesh;
  public leftLeg: THREE.Group;
  public rightLeg: THREE.Group;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public shadow: THREE.Mesh;

  public animCycle: number = 0;
  public card: PlayerCard;
  public team: 'blue' | 'red';

  constructor(card: PlayerCard, team: 'blue' | 'red') {
    this.card = card;
    this.team = team;
    this.group = new THREE.Group();

    const skinColor = card.skin || '#ffdbac';
    const hairColor = card.hair || '#2c1b18';
    const kitColor = team === 'blue' ? 0x00f0ff : 0xff0055;
    const shortsColor = team === 'blue' ? 0x091225 : 0x220512;

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    const kitMat = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.45, metalness: 0.1 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsColor, roughness: 0.5 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

    // 1. Torso (0.85m height, 0.45m width, 0.25m depth)
    const torsoGeo = new THREE.BoxGeometry(0.48, 0.72, 0.28);
    this.torso = new THREE.Mesh(torsoGeo, kitMat);
    this.torso.position.y = 1.25;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Shorts
    const shortsGeo = new THREE.BoxGeometry(0.50, 0.35, 0.30);
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = -0.38;
    this.torso.add(shorts);

    // 2. Head
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.54;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.04;
    this.head.add(hair);

    // 3. Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.9, 0);
    const thigh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.46), skinMat);
    thigh1.position.y = -0.23;
    const shin1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.46), kitMat);
    shin1.position.y = -0.69;
    const boot1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.24), bootMat);
    boot1.position.set(0, -0.92, 0.06);
    this.leftLeg.add(thigh1, shin1, boot1);
    this.group.add(this.leftLeg);

    // 4. Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.9, 0);
    const thigh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.46), skinMat);
    thigh2.position.y = -0.23;
    const shin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.46), kitMat);
    shin2.position.y = -0.69;
    const boot2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.24), bootMat);
    boot2.position.set(0, -0.92, 0.06);
    this.rightLeg.add(thigh2, shin2, boot2);
    this.group.add(this.rightLeg);

    // 5. Arms
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.32, 1.5, 0);
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.65), skinMat);
    arm1.position.y = -0.32;
    this.leftArm.add(arm1);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.32, 1.5, 0);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.65), skinMat);
    arm2.position.y = -0.32;
    this.rightArm.add(arm2);
    this.group.add(this.rightArm);

    // 6. Dynamic Shadow Disc on Pitch
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.03;
    this.group.add(this.shadow);
  }

  public updateAnimation(isMoving: boolean, speedMultiplier: number = 1.0): void {
    if (isMoving) {
      this.animCycle += 0.18 * speedMultiplier;
      const legSwing = Math.sin(this.animCycle) * 0.75;
      const armSwing = Math.cos(this.animCycle) * 0.65;

      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -armSwing;
      this.rightArm.rotation.x = armSwing;
      this.torso.position.y = 1.25 + Math.abs(Math.sin(this.animCycle * 2)) * 0.06;
    } else {
      // Idle breathing
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
      this.leftArm.rotation.x *= 0.8;
      this.rightArm.rotation.x *= 0.8;
      this.torso.position.y = 1.25 + Math.sin(Date.now() * 0.003) * 0.02;
    }
  }
}
