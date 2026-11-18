/**
 * CYBERFC 28 — 3D Stadium Pitch & Goalposts
 * High-definition Premier League turf with mowing bands, field markings, and 3D goalposts.
 */

import * as THREE from 'three';

export interface PitchDimensions {
  length: number; // e.g. 105m (scaled to 105 units)
  width: number;  // e.g. 68m (scaled to 68 units)
  goalWidth: number; // 7.32m
  goalHeight: number; // 2.44m
  goalDepth: number; // 2.0m
}

export const DEFAULT_PITCH: PitchDimensions = {
  length: 105,
  width: 68,
  goalWidth: 7.32,
  goalHeight: 2.44,
  goalDepth: 2.0
};

export class Pitch {
  public group: THREE.Group;
  public dimensions: PitchDimensions;

  constructor(dimensions: PitchDimensions = DEFAULT_PITCH) {
    this.dimensions = dimensions;
    this.group = new THREE.Group();
    this.buildPitch();
    this.buildMarkings();
    this.buildGoals();
  }

  private buildPitch(): void {
    const { length, width } = this.dimensions;
    const geometry = new THREE.PlaneGeometry(length + 10, width + 10, 64, 64);

    // Procedural grass texture canvas with mowing stripes
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base emerald green
    ctx.fillStyle = '#1e6828';
    ctx.fillRect(0, 0, 1024, 1024);

    // Alternating 20 mowing stripes
    const stripeCount = 20;
    const stripeW = 1024 / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 120, 45, 0.95)' : 'rgba(24, 95, 34, 0.95)';
      ctx.fillRect(i * stripeW, 0, stripeW, 1024);
    }

    // Subtle grass grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 12;
      imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private buildMarkings(): void {
    const { length, width } = this.dimensions;
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineThickness = 0.12;

    // Outer boundary
    const boundaryGeo = new THREE.BufferGeometry();
    const halfL = length / 2;
    const halfW = width / 2;
    const y = 0.02;

    const points = [
      new THREE.Vector3(-halfL, y, -halfW),
      new THREE.Vector3(halfL, y, -halfW),
      new THREE.Vector3(halfL, y, halfW),
      new THREE.Vector3(-halfL, y, halfW),
      new THREE.Vector3(-halfL, y, -halfW),
      // Half-way line
      new THREE.Vector3(0, y, -halfW),
      new THREE.Vector3(0, y, halfW)
    ];

    boundaryGeo.setFromPoints(points);
    const line = new THREE.Line(boundaryGeo, lineMaterial);
    this.group.add(line);

    // Center circle (radius 9.15m)
    const circleGeo = new THREE.RingGeometry(9.15 - lineThickness, 9.15, 64);
    const circleMesh = new THREE.Mesh(circleGeo, lineMaterial);
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.y = 0.02;
    this.group.add(circleMesh);

    // Center spot
    const spotGeo = new THREE.CircleGeometry(0.3, 32);
    const spotMesh = new THREE.Mesh(spotGeo, lineMaterial);
    spotMesh.rotation.x = -Math.PI / 2;
    spotMesh.position.y = 0.025;
    this.group.add(spotMesh);
  }

  private buildGoals(): void {
    const { length, goalWidth, goalHeight, goalDepth } = this.dimensions;
    const halfL = length / 2;

    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8
    });

    const postRadius = 0.08;

    const createGoal = (xPos: number, rotationY: number) => {
      const goalGroup = new THREE.Group();
      goalGroup.position.set(xPos, 0, 0);
      goalGroup.rotation.y = rotationY;

      // Left post
      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16), postMaterial);
      leftPost.position.set(0, goalHeight / 2, -goalWidth / 2);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16), postMaterial);
      rightPost.position.set(0, goalHeight / 2, goalWidth / 2);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      // Crossbar
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16), postMaterial);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, goalHeight, 0);
      crossbar.castShadow = true;
      goalGroup.add(crossbar);

      // Back frame
      const backPost1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, goalDepth, 16), postMaterial);
      backPost1.rotation.y = Math.PI / 2;
      backPost1.position.set(-goalDepth / 2, 0.05, -goalWidth / 2);
      goalGroup.add(backPost1);

      const backPost2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, goalDepth, 16), postMaterial);
      backPost2.rotation.y = Math.PI / 2;
      backPost2.position.set(-goalDepth / 2, 0.05, goalWidth / 2);
      goalGroup.add(backPost2);

      this.group.add(goalGroup);
    };

    // Blue goal (Left, facing +X)
    createGoal(-halfL, 0);

    // Red goal (Right, facing -X)
    createGoal(halfL, Math.PI);
  }
}
