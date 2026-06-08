import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreePreviewProps {
  skin: string; // Minecraft Username
  capeUrl?: string; // Optional Cape Image URL
  wingsEnabled?: boolean; // Toggled by active cosmetics
}

export default function ThreePreview({ skin, capeUrl, wingsEnabled = true }: ThreePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 220;
    const height = container.clientHeight || 280;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = null; // transparent background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x2d7dd2, 0.35);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 3. Player Group
    const playerGroup = new THREE.Group();
    playerGroup.position.y = -6; // center the model
    scene.add(playerGroup);

    // Materials and Meshes
    let head: THREE.Mesh;
    let body: THREE.Mesh;
    let leftArm: THREE.Mesh;
    let rightArm: THREE.Mesh;
    let leftLeg: THREE.Mesh;
    let rightLeg: THREE.Mesh;
    let cape: THREE.Mesh;
    let leftWing: THREE.Mesh;
    let rightWing: THREE.Mesh;

    // Load skin texture
    const textureLoader = new THREE.TextureLoader();
    const skinImgUrl = `https://mc-heads.net/skin/${skin}`;

    // Helper to slice texture from image canvas
    const sliceSkin = (img: HTMLImageElement) => {
      const is64x64 = img.height === img.width;

      const getMaterial = (x: number, y: number, w: number, h: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = w * 4;
        canvas.height = h * 4;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, x, y, w, h, 0, 0, w * 4, h * 4);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      };

      // Slice all boxes
      // Head: 8x8x8. Coordinates: Right, Left, Top, Bottom, Front, Back
      const headMaterials = [
        getMaterial(0, 8, 8, 8),   // Right
        getMaterial(16, 8, 8, 8),  // Left
        getMaterial(8, 0, 8, 8),   // Top
        getMaterial(16, 0, 8, 8),  // Bottom
        getMaterial(8, 8, 8, 8),   // Front
        getMaterial(24, 8, 8, 8)   // Back
      ];
      const headGeo = new THREE.BoxGeometry(8, 8, 8);
      head = new THREE.Mesh(headGeo, headMaterials);
      head.position.y = 16;
      playerGroup.add(head);

      // Torso: 8x12x4.
      const torsoMaterials = [
        getMaterial(16, 20, 4, 12), // Right
        getMaterial(28, 20, 4, 12), // Left
        getMaterial(20, 16, 8, 4),  // Top
        getMaterial(28, 16, 8, 4),  // Bottom
        getMaterial(20, 20, 8, 12), // Front
        getMaterial(32, 20, 8, 12)  // Back
      ];
      const torsoGeo = new THREE.BoxGeometry(8, 12, 4);
      body = new THREE.Mesh(torsoGeo, torsoMaterials);
      body.position.y = 6;
      playerGroup.add(body);

      // Right Arm: 4x12x4.
      const rArmMaterials = [
        getMaterial(40, 20, 4, 12), // Right
        getMaterial(48, 20, 4, 12), // Left
        getMaterial(44, 16, 4, 4),  // Top
        getMaterial(48, 16, 4, 4),  // Bottom
        getMaterial(44, 20, 4, 12), // Front
        getMaterial(52, 20, 4, 12)  // Back
      ];
      const rArmGeo = new THREE.BoxGeometry(4, 12, 4);
      rightArm = new THREE.Mesh(rArmGeo, rArmMaterials);
      rightArm.position.set(6, 6, 0);
      playerGroup.add(rightArm);

      // Left Arm: 4x12x4.
      const lArmMaterials = is64x64 ? [
        getMaterial(32, 52, 4, 12), // Right
        getMaterial(40, 52, 4, 12), // Left
        getMaterial(36, 48, 4, 4),  // Top
        getMaterial(40, 48, 4, 4),  // Bottom
        getMaterial(36, 52, 4, 12), // Front
        getMaterial(44, 52, 4, 12)  // Back
      ] : rArmMaterials; // Mirror right arm if 64x32
      const lArmGeo = new THREE.BoxGeometry(4, 12, 4);
      leftArm = new THREE.Mesh(lArmGeo, lArmMaterials);
      leftArm.position.set(-6, 6, 0);
      playerGroup.add(leftArm);

      // Right Leg: 4x12x4.
      const rLegMaterials = [
        getMaterial(0, 20, 4, 12),  // Right
        getMaterial(8, 20, 4, 12),  // Left
        getMaterial(4, 16, 4, 4),   // Top
        getMaterial(8, 16, 4, 4),   // Bottom
        getMaterial(4, 20, 4, 12),  // Front
        getMaterial(12, 20, 4, 12)  // Back
      ];
      const rLegGeo = new THREE.BoxGeometry(4, 12, 4);
      rightLeg = new THREE.Mesh(rLegGeo, rLegMaterials);
      rightLeg.position.set(2, -6, 0);
      playerGroup.add(rightLeg);

      // Left Leg: 4x12x4.
      const lLegMaterials = is64x64 ? [
        getMaterial(16, 52, 4, 12), // Right
        getMaterial(24, 52, 4, 12), // Left
        getMaterial(20, 48, 4, 4),  // Top
        getMaterial(24, 48, 4, 4),  // Bottom
        getMaterial(20, 52, 4, 12), // Front
        getMaterial(28, 52, 4, 12)  // Back
      ] : rLegMaterials; // Mirror right leg if 64x32
      const lLegGeo = new THREE.BoxGeometry(4, 12, 4);
      leftLeg = new THREE.Mesh(lLegGeo, lLegMaterials);
      leftLeg.position.set(-2, -6, 0);
      playerGroup.add(leftLeg);

      // 4. Wings Cosmetics (optional)
      if (wingsEnabled) {
        const wingMat = new THREE.MeshBasicMaterial({ color: 0x2d7dd2, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const wingGeo = new THREE.PlaneGeometry(10, 14);

        // Wing pivots for rotation
        const leftWingPivot = new THREE.Group();
        leftWingPivot.position.set(-4, 8, -2.1);
        const lWingMesh = new THREE.Mesh(wingGeo, wingMat);
        lWingMesh.position.set(-5, 0, 0); // shift mesh to pivot edge
        leftWingPivot.add(lWingMesh);
        playerGroup.add(leftWingPivot);
        leftWing = leftWingPivot as any;

        const rightWingPivot = new THREE.Group();
        rightWingPivot.position.set(4, 8, -2.1);
        const rWingMesh = new THREE.Mesh(wingGeo, wingMat);
        rWingMesh.position.set(5, 0, 0); // shift mesh to pivot edge
        rightWingPivot.add(rWingMesh);
        playerGroup.add(rightWingPivot);
        rightWing = rightWingPivot as any;
      }

      // 5. Cape Cosmetic (optional)
      if (capeUrl) {
        textureLoader.load(capeUrl, (capeTex) => {
          capeTex.magFilter = THREE.NearestFilter;
          capeTex.minFilter = THREE.NearestFilter;
          const capeMat = new THREE.MeshBasicMaterial({ map: capeTex, side: THREE.DoubleSide });
          const capeGeo = new THREE.BoxGeometry(6, 15, 0.5);
          cape = new THREE.Mesh(capeGeo, capeMat);
          cape.position.set(0, 4.5, -2.5);
          playerGroup.add(cape);
        });
      }
    };

    const loaderImg = new Image();
    loaderImg.crossOrigin = 'anonymous';
    loaderImg.src = skinImgUrl;
    loaderImg.onload = () => {
      sliceSkin(loaderImg);
    };

    // 6. Interactive Drag Controls
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      playerGroup.rotation.y += deltaX * 0.015;
      playerGroup.rotation.x += deltaY * 0.015;
      playerGroup.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, playerGroup.rotation.x));

      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    // Touch support
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;

      playerGroup.rotation.y += deltaX * 0.015;
      playerGroup.rotation.x += deltaY * 0.015;
      playerGroup.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, playerGroup.rotation.x));

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    // 7. Animation Loop
    let animationId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Wing flapping animation
      if (leftWing) {
        leftWing.rotation.y = Math.sin(time * 5.0) * 0.45 - 0.25;
        leftWing.rotation.z = Math.cos(time * 5.0) * 0.1;
      }
      if (rightWing) {
        rightWing.rotation.y = -Math.sin(time * 5.0) * 0.45 + 0.25;
        rightWing.rotation.z = -Math.cos(time * 5.0) * 0.1;
      }

      // Cape waving animation
      if (cape) {
        cape.rotation.x = Math.sin(time * 3.5) * 0.18 + 0.12;
      }

      // Idle breathing/floating animation
      if (head) {
        head.position.y = 16 + Math.sin(time * 1.5) * 0.1;
      }
      if (body) {
        body.position.y = 6 + Math.sin(time * 1.5) * 0.08;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [skin, capeUrl, wingsEnabled]);

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
}
