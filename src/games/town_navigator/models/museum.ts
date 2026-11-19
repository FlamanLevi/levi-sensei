import * as THREE from 'three';
import { getConcretePanelTexture, addWrapAroundWindows, getClearShowcaseGlassMaterial, buildPerimeterRailing } from './wallTextures';

let cachedMuseumSignTex: THREE.CanvasTexture | null = null;

function createMuseumSignTexture(): THREE.CanvasTexture {
  if (cachedMuseumSignTex) return cachedMuseumSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cx - 16, cy - 22, 32, 6);
  ctx.fillRect(cx - 10, cy - 16, 20, 34);
  ctx.fillRect(cx - 16, cy + 18, 32, 6);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('MUSEUM', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('博物館 (HAKUBUTSUKAN)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedMuseumSignTex = texture;
  return texture;
}

let cachedMuseumBannerTex: THREE.CanvasTexture | null = null;

function createMuseumBannerTexture(): THREE.CanvasTexture {
  if (cachedMuseumBannerTex) return cachedMuseumBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Left half: DINOSAURS, Right half: JAPANESE ART
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(128, 0, 128, 256);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 248);
  ctx.strokeRect(132, 4, 120, 248);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SPECIAL', 64, 38);
  ctx.fillText('EXHIBIT', 192, 38);

  // Dino silhouette icon
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(64, 118, 28, 0, Math.PI * 2);
  ctx.fill();
  // Torii / Art motif
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(166, 94, 52, 8);
  ctx.fillRect(174, 102, 8, 42);
  ctx.fillRect(202, 102, 8, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('DINOSAURS', 64, 186);
  ctx.fillText('JAPANESE', 192, 180);
  ctx.fillText('ART', 192, 202);

  ctx.font = 'bold 14px "UD Digi Kyokasho NP-R", sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('恐竜展', 64, 224);
  ctx.fillText('日本美術', 192, 228);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedMuseumBannerTex = tex;
  return tex;
}

export interface MuseumOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

export function buildMuseumMesh(options: MuseumOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Museum_hwg5_u19_19';

  // Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.65,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.68,
  });
  const clearGlassMat = getClearShowcaseGlassMaterial();
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 2.2);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.076, 3.4);
  plaza.receiveShadow = true;
  group.add(plaza);

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

  // 2. MAIN NEOCLASSICAL MUSEUM PAVILION
  const museumGroup = new THREE.Group();
  museumGroup.position.set(0, 0.15, -0.6);

  const bW = 9.8;
  const bD = 6.6;
  const bH = 6.8;

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), stoneMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  museumGroup.add(bodyMesh);

  // Classical Entablature Cornice Trim around Roofline + Stone Balustrade
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.3, 0.42, bD + 0.3), darkStoneMat);
  cornice.position.y = bH + 0.21;
  museumGroup.add(cornice);

  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.55, darkStoneMat, 1.6);
  roofRail.position.set(0, bH + 0.42, 0);
  museumGroup.add(roofRail);

  // Louvre-style Clear Glass Rooftop Skylight Pyramid + Structural Mullion Ribs
  const skylightGeo = new THREE.ConeGeometry(2.6 * Math.SQRT1_2, 1.8, 4);
  skylightGeo.rotateY(Math.PI / 4);
  const skylight = new THREE.Mesh(skylightGeo, clearGlassMat);
  skylight.position.set(0, bH + 0.42 + 0.9, -0.4);
  museumGroup.add(skylight);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.55, 6), darkStoneMat);
    rib.position.set(sx * 0.65, bH + 0.42 + 0.9, -0.4 + sz * 0.65);
    rib.rotation.z = sx * 0.62;
    rib.rotation.x = -sz * 0.62;
    museumGroup.add(rib);
  });

  // Tall Clear Front Gallery Windows flanking the portico
  [-3.8, -2.8, 2.8, 3.8].forEach((wx) => {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 3.6, 0.08), darkStoneMat);
    winFrame.position.set(wx, 3.2, bD / 2 + 0.02);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.68, 3.4, 0.05), clearGlassMat);
    winGlass.position.set(wx, 3.2, bD / 2 + 0.04);
    const transom = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.07), darkStoneMat);
    transom.position.set(wx, 3.9, bD / 2 + 0.04);
    museumGroup.add(winFrame, winGlass, transom);
  });

  // Side & Rear Exhibition Hall Windows (for 360° street-corner detail)
  addWrapAroundWindows({
    targetGroup: museumGroup,
    bW,
    bD,
    floorHeights: [2.4, 5.0],
    winW: 1.1,
    winH: 1.5,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: darkStoneMat,
  });

  // 3. CLASSICAL 4-COLUMN PORTICO & EXTRUDED TRIANGULAR PEDIMENT
  const porticoW = 4.6;
  const porticoD = 1.3;
  const colH = 4.8;

  // Entablature Architrave Beam spanning the 4 columns
  const architrave = new THREE.Mesh(new THREE.BoxGeometry(porticoW + 0.2, 0.45, porticoD + 0.2), stoneMat);
  architrave.position.set(0, colH + 0.22, bD / 2 + porticoD / 2);
  museumGroup.add(architrave);

  // True Extruded Triangular Pediment with Recessed Tympanum
  const pedH = 1.45;
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-porticoW / 2 - 0.15, 0);
  pedShape.lineTo(0, pedH);
  pedShape.lineTo(porticoW / 2 + 0.15, 0);
  pedShape.closePath();

  const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: porticoD + 0.2, bevelEnabled: false });
  pedGeo.translate(0, colH + 0.45, bD / 2 - 0.05);
  const pediment = new THREE.Mesh(pedGeo, darkStoneMat);
  pediment.castShadow = true;
  museumGroup.add(pediment);

  // Golden Classical Medallion Relief in Center of Pediment Tympanum
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16), bronzeMat);
  medallion.rotateX(Math.PI / 2);
  medallion.position.set(0, colH + 0.95, bD / 2 + porticoD + 0.15);
  museumGroup.add(medallion);

  // Limestone Corner Quoins along all 4 corners
  const quoinGeo = new THREE.BoxGeometry(0.36, 0.42, 0.36);
  [
    [-bW / 2 + 0.08, -bD / 2 + 0.08],
    [bW / 2 - 0.08, -bD / 2 + 0.08],
    [-bW / 2 + 0.08, bD / 2 - 0.08],
    [bW / 2 - 0.08, bD / 2 - 0.08],
  ].forEach(([qx, qz]) => {
    for (let qy = 0.45; qy < bH - 0.3; qy += 0.9) {
      const quoin = new THREE.Mesh(quoinGeo, darkStoneMat);
      quoin.position.set(qx, qy, qz);
      museumGroup.add(quoin);
    }
  });

  // Interior Display Vitrines Positioned Directly Behind Clear Gallery Windows (x = ±2.8)
  const vitrineGoldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.75, roughness: 0.25 });
  [-2.8, 2.8].forEach((vx) => {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.55, 0.42), darkStoneMat);
    ped.position.set(vx, 0.775, bD / 2 - 0.28);
    const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), vitrineGoldMat);
    artifact.position.set(vx, 1.85, bD / 2 - 0.28);
    museumGroup.add(ped, artifact);
  });

  // Vertical Exhibition Cloth Banners with Brass Hanging Rods
  const bannerTex = createMuseumBannerTexture();
  const leftBannerGeo = new THREE.PlaneGeometry(0.64, 2.2);
  const uvL = leftBannerGeo.attributes.uv;
  for (let i = 0; i < uvL.count; i++) {
    uvL.setX(i, uvL.getX(i) * 0.5);
  }
  const rightBannerGeo = new THREE.PlaneGeometry(0.64, 2.2);
  const uvR = rightBannerGeo.attributes.uv;
  for (let i = 0; i < uvR.count; i++) {
    uvR.setX(i, 0.5 + uvR.getX(i) * 0.5);
  }
  const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.55, side: THREE.DoubleSide });
  const bannerL = new THREE.Mesh(leftBannerGeo, bannerMat);
  bannerL.position.set(-2.35, 3.1, bD / 2 + 0.12);
  const bannerR = new THREE.Mesh(rightBannerGeo, bannerMat);
  bannerR.position.set(2.35, 3.1, bD / 2 + 0.12);
  [-2.35, 2.35].forEach((bx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.78, 8), bronzeMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(bx, 4.22, bD / 2 + 0.12);
    museumGroup.add(rod);
  });
  museumGroup.add(bannerL, bannerR);

  // 4 Classical Columns with Bases, Capitals & Warm Portico Uplights
  const uplightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  [-1.8, -0.6, 0.6, 1.8].forEach(cx => {
    const colZ = bD / 2 + porticoD - 0.22;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.46), darkStoneMat);
    base.position.set(cx, 0.48, colZ);
    const uplight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 12), uplightMat);
    uplight.position.set(cx, 0.61, colZ);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, colH - 0.6, 16), stoneMat);
    shaft.position.set(cx, colH / 2 + 0.2, colZ);
    shaft.castShadow = true;
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), darkStoneMat);
    capital.position.set(cx, colH - 0.1, colZ);
    museumGroup.add(base, uplight, shaft, capital);
  });

  // Bronze Museum Double Doors with Handles
  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.08), bronzeMat);
  doors.position.set(0, 1.76, bD / 2 + 0.05);
  museumGroup.add(doors);

  // Broad Entrance Steps (Tightened strictly inside z <= 4.45m)
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(5.6 - s * 0.3, 0.12, 1.4 - s * 0.2), darkStoneMat);
    step.position.set(0, (s + 0.5) * 0.12, bD / 2 + 0.65 + (2 - s) * 0.12);
    step.receiveShadow = true;
    museumGroup.add(step);
  }

  // Prominent Header Signboard: "MUSEUM / 博物館" anchored flush on stone entablature
  const signTexture = createMuseumSignTexture();
  const signMat = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.4 });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.14), [
    darkStoneMat, darkStoneMat, darkStoneMat, darkStoneMat, signMat, darkStoneMat
  ]);
  signMesh.position.set(0, bH + 0.22, bD / 2 + 0.20);
  museumGroup.add(signMesh);

  group.add(museumGroup);

  // 4. OUTDOOR BRONZE SCULPTURE, PLAQUE & STONE PLAZA BENCH
  const sculptureGroup = new THREE.Group();
  sculptureGroup.position.set(-3.6, 0.15, 3.8);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), darkStoneMat);
  pedestal.position.y = 0.4;
  pedestal.castShadow = true;
  sculptureGroup.add(pedestal);

  const artMesh = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 12, 24), bronzeMat);
  artMesh.rotation.x = Math.PI / 4;
  artMesh.position.y = 1.25;
  artMesh.castShadow = true;
  sculptureGroup.add(artMesh);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.04), bronzeMat);
  plaque.position.set(0, 0.45, 0.42);
  sculptureGroup.add(plaque);

  group.add(sculptureGroup);

  // Stone Museum Plaza Bench (East Plaza)
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.5), darkStoneMat);
  benchSeat.position.set(3.4, 0.55, 3.8);
  const benchLegL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.44), darkStoneMat);
  benchLegL.position.set(2.75, 0.35, 3.8);
  const benchLegR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.44), darkStoneMat);
  benchLegR.position.set(4.05, 0.35, 3.8);
  group.add(benchSeat, benchLegL, benchLegR);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
