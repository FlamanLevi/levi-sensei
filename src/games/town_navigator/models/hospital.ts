import * as THREE from 'three';
import {
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedHospitalSignTex: THREE.CanvasTexture | null = null;
let cachedEmergencyBannerTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Hospital main sign
 */
function createHospitalSignTexture(): THREE.CanvasTexture {
  if (cachedHospitalSignTex) return cachedHospitalSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(cx - 6, cy - 22, 12, 44);
  ctx.fillRect(cx - 22, cy - 6, 44, 12);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px sans-serif';
  ctx.fillText('HOSPITAL', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#99f6e4';
  ctx.fillText('総合病院 (HOSPITAL)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedHospitalSignTex = texture;
  return texture;
}

/**
 * Procedural texture for the 24H Emergency Ambulance Entrance Canopy
 */
function createEmergencyBannerTexture(): THREE.CanvasTexture {
  if (cachedEmergencyBannerTex) return cachedEmergencyBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 250, 58);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('EMERGENCY 24H', 128, 26);
  ctx.font = 'bold 15px "BIZ UDPGothic", sans-serif';
  ctx.fillText('救急外来・専用入口', 128, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedEmergencyBannerTex = texture;
  return texture;
}

/**
 * Builds an authentic procedural Japanese High-Roof Ambulance (Kyūkyūsha / 救急車)
 */
function buildAmbulance(): THREE.Group {
  const amb = new THREE.Group();
  amb.name = 'Ambulance_Kyukyusha';

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, transparent: true, opacity: 0.7 });
  const emergencyLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
  });

  const ambW = 1.9;
  const ambL = 4.2;

  // 4 Wheels + Chrome Hubs
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-ambW / 2 - 0.04, 0.32, 1.2],
    [ambW / 2 + 0.04, 0.32, 1.2],
    [-ambW / 2 - 0.04, 0.32, -1.2],
    [ambW / 2 + 0.04, 0.32, -1.2],
  ].forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, darkMetalMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.21, 12), chromeMat);
    rim.rotateZ(Math.PI / 2);
    rim.position.set(wx, wy, wz);
    amb.add(tire, rim);
  });

  // Van Main Body (White)
  const bodyGeo = new THREE.BoxGeometry(ambW, 1.35, ambL);
  const body = new THREE.Mesh(bodyGeo, whiteMat);
  body.position.set(0, 1.05, 0);
  body.castShadow = true;
  amb.add(body);

  // High Aerodynamic HiMedic Roof Crown
  const roofGeo = new THREE.BoxGeometry(ambW - 0.14, 0.45, ambL - 0.35);
  const roof = new THREE.Mesh(roofGeo, whiteMat);
  roof.position.set(0, 1.85, -0.08);
  amb.add(roof);

  // Horizontal Red Emergency Reflective Stripe along all 4 sides
  const stripeGeo = new THREE.BoxGeometry(ambW + 0.03, 0.15, ambL + 0.03);
  const stripe = new THREE.Mesh(stripeGeo, redMat);
  stripe.position.set(0, 1.02, 0);
  amb.add(stripe);

  // Side Patient Compartment Tinted Windows & Red Cross Emblems
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(ambW + 0.02, 0.48, 2.4), glassMat);
  sideWin.position.set(0, 1.42, 0.35);
  amb.add(sideWin);

  [-ambW / 2 - 0.02, ambW / 2 + 0.02].forEach(sx => {
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.26, 0.09), redMat);
    vBar.position.set(sx, 1.45, -1.35);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.26), redMat);
    hBar.position.set(sx, 1.45, -1.35);
    amb.add(vBar, hBar);
  });

  // Windshield, Front Bumper, Headlights & Red Grille Flashers
  const win = new THREE.Mesh(new THREE.BoxGeometry(ambW - 0.18, 0.58, 0.04), glassMat);
  win.position.set(0, 1.34, ambL / 2 + 0.01);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(ambW + 0.06, 0.25, 0.15), chromeMat);
  bumper.position.set(0, 0.45, ambL / 2 + 0.05);
  amb.add(win, bumper);

  [-0.65, 0.65].forEach((hx) => {
    const hLamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.04), headlightMat);
    hLamp.position.set(hx, 0.78, ambL / 2 + 0.02);
    const flasher = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.04), emergencyLightMat);
    flasher.position.set(hx * 0.45, 0.78, ambL / 2 + 0.02);
    amb.add(hLamp, flasher);
  });

  // Wrap-Around Red Flashing Light Bars on High Roof (Front & Rear)
  const lightBarFront = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.26), emergencyLightMat);
  lightBarFront.position.set(0, 2.12, 1.25);
  const lightBarRear = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.26), emergencyLightMat);
  lightBarRear.position.set(0, 2.12, -1.45);
  amb.add(lightBarFront, lightBarRear);

  return amb;
}

export interface HospitalOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese General Hospital (hwg5_u19_08)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildHospitalMesh(options: HospitalOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Hospital_hwg5_u19_08';

  // Materials
  const hospitalWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    map: getBrickTileTexture(),
    roughness: 0.5,
  });
  const tealAccentMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45 });
  const redCrossMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xdc2626,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const helipadGreenLightMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.9,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.076, 3.75);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Sidewalk slab: COMPLETELY UNOBSTRUCTED (Z in [+4.5, +6.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotSize, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, foundationMat);
  sidewalk.position.set(0, 0.075, 5.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotSize, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.09, 6.0);
  curb.receiveShadow = true;
  group.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(lotSize, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 6.9);
    road.receiveShadow = true;
    group.add(road);

    const roadLineGeo = new THREE.BoxGeometry(lotSize, 0.022, 0.12);
    const roadLine = new THREE.Mesh(roadLineGeo, whiteLineMat);
    roadLine.position.set(0, 0.012, 6.4);
    group.add(roadLine);
  }

  // 2. MAIN 3-STORY HOSPITAL BUILDING
  const hospitalGroup = new THREE.Group();
  hospitalGroup.position.set(0, 0.15, -0.6);

  const bW = 9.8;
  const bD = 6.6;
  const bH = 8.6;

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), hospitalWhiteMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  hospitalGroup.add(bodyMesh);

  [2.8, 5.6, bH].forEach(fy => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.12, 0.20, bD + 0.12), tealAccentMat);
    band.position.y = fy;
    hospitalGroup.add(band);
  });

  // Open Rooftop Safety Perimeter Railing
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.65, steelMat, 1.6);
  roofRail.position.set(0, bH + 0.1, 0);
  hospitalGroup.add(roofRail);

  // 360° Side & Rear Clinical Ward Windows
  addWrapAroundWindows({
    targetGroup: hospitalGroup,
    bW,
    bD,
    floorHeights: [1.4, 4.2, 7.0],
    winW: 1.05,
    winH: 1.3,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: tealAccentMat,
  });

  // Front Ward Windows Across 3 Stories
  for (let story = 0; story < 3; story++) {
    const wy = 1.4 + story * 2.8;
    for (let c = 0; c < 6; c++) {
      const wx = -3.8 + c * 1.5;
      if (story === 0 && Math.abs(wx) < 1.2) continue;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.38, 0.05), tealAccentMat);
      frame.position.set(wx, wy, bD / 2 + 0.015);
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.06), glassMat);
      win.position.set(wx, wy, bD / 2 + 0.03);
      hospitalGroup.add(frame, win);
    }
  }

  // 3. ROOFTOP PENTHOUSE & RED CROSS (detail2 at X = -1.2m, Y = 9.2m) + HELIPAD
  const pentW = 3.2;
  const pentH = 1.65;
  const pentD = 2.4;
  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(pentW, pentH, pentD), hospitalWhiteMat);
  penthouse.position.set(-1.5, bH + pentH / 2, 0);
  penthouse.castShadow = true;
  hospitalGroup.add(penthouse);

  // 3D Glowing Red Cross on Front of Penthouse
  const rcGroup = new THREE.Group();
  rcGroup.position.set(-1.5, bH + pentH / 2, pentD / 2 + 0.06);
  const rcV = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.25, 0.10), redCrossMat);
  const rcH = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 0.10), redCrossMat);
  rcGroup.add(rcV, rcH);
  hospitalGroup.add(rcGroup);

  // Emergency Rooftop Helipad (H Circle: X = 2.2m on flat roof)
  const helipadGroup = new THREE.Group();
  helipadGroup.position.set(2.2, bH + 0.04, 0);

  const ringGeo = new THREE.RingGeometry(1.4, 1.65, 24);
  const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }));
  ringMesh.rotation.x = -Math.PI / 2;
  helipadGroup.add(ringMesh);

  const hBarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const hLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 1.6), hBarMat);
  hLeft.position.set(-0.55, 0, 0);
  const hRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 1.6), hBarMat);
  hRight.position.set(0.55, 0, 0);
  const hMid = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.01, 0.25), hBarMat);
  hMid.position.set(0, 0, 0);
  helipadGroup.add(hLeft, hRight, hMid);

  // Glowing Green Helipad Perimeter Lights
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const pLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), helipadGreenLightMat);
    pLight.position.set(Math.cos(a) * 1.75, 0.04, Math.sin(a) * 1.75);
    helipadGroup.add(pLight);
  }

  const windsockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), darkMetalMat);
  windsockPole.position.set(1.6, 0.7, 1.6);
  const sockCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 })
  );
  sockCone.rotation.z = Math.PI / 2;
  sockCone.position.set(1.8, 1.3, 1.6);
  helipadGroup.add(windsockPole, sockCone);

  hospitalGroup.add(helipadGroup);

  // 4. OUTPATIENT MAIN ENTRANCE (Left Wing: X = -2.4m) & EMERGENCY AMBULANCE BAY (Right Wing: X = +2.8m)
  const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.8), tealAccentMat);
  entranceCanopy.position.set(-2.4, 2.7, bD / 2 + 0.9);
  entranceCanopy.castShadow = true;
  hospitalGroup.add(entranceCanopy);

  [-1.6, 1.6].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 12), darkMetalMat);
    pillar.position.set(-2.4 + px, 1.35, bD / 2 + 1.7);
    hospitalGroup.add(pillar);
  });

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 0.06), glassMat);
  doors.position.set(-2.4, 1.15, bD / 2 + 0.04);
  hospitalGroup.add(doors);

  // Right Side: Emergency Ambulance Drop-Off Portico (detail1 at X = +2.8m)
  const erCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 2.2), tealAccentMat);
  erCanopy.position.set(2.8, 3.2, bD / 2 + 1.1);
  erCanopy.castShadow = true;
  hospitalGroup.add(erCanopy);

  const erBannerMat = new THREE.MeshStandardMaterial({
    map: createEmergencyBannerTexture(),
    emissive: 0xffffff,
    emissiveMap: createEmergencyBannerTexture(),
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const erBanner = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.48, 0.08), [
    redCrossMat, redCrossMat, redCrossMat, redCrossMat, erBannerMat, redCrossMat,
  ]);
  erBanner.position.set(2.8, 3.55, bD / 2 + 2.18);
  hospitalGroup.add(erBanner);

  // Prominent Header Signboard: "HOSPITAL / 総合病院"
  const signTexture = createHospitalSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.12), [
    tealAccentMat, tealAccentMat, tealAccentMat, tealAccentMat, signMat, tealAccentMat
  ]);
  signMesh.position.set(0, 6.2, bD / 2 + 0.12);
  hospitalGroup.add(signMesh);

  group.add(hospitalGroup);

  // 5. JAPANESE AMBULANCE (detail1: Parked at ER Bay on Right Apron at X = +2.8m, Z = 2.3m)
  const ambulance = buildAmbulance();
  ambulance.position.set(2.8, 0.15, 2.3);
  group.add(ambulance);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
