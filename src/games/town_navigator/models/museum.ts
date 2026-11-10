import * as THREE from 'three';
import { getConcretePanelTexture, addWrapAroundWindows } from './wallTextures';

function createMuseumSignTexture(): THREE.CanvasTexture {
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
  return texture;
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

  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.076, 3.75);
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

  // Classical Entablature Cornice Trim around Roofline
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.3, 0.42, bD + 0.3), darkStoneMat);
  cornice.position.y = bH + 0.21;
  museumGroup.add(cornice);

  // Louvre-style Glass Rooftop Skylight Pyramid on the Gallery Roof
  const skylightGeo = new THREE.ConeGeometry(2.6 * Math.SQRT1_2, 1.8, 4);
  skylightGeo.rotateY(Math.PI / 4);
  const skylight = new THREE.Mesh(skylightGeo, glassMat);
  skylight.position.set(0, bH + 0.42 + 0.9, -0.4);
  museumGroup.add(skylight);

  // Tall Arched Front Gallery Windows flanking the portico
  [-3.8, -2.8, 2.8, 3.8].forEach((wx) => {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 3.6, 0.08), darkStoneMat);
    winFrame.position.set(wx, 3.2, bD / 2 + 0.02);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.68, 3.4, 0.06), glassMat);
    winGlass.position.set(wx, 3.2, bD / 2 + 0.04);
    museumGroup.add(winFrame, winGlass);
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

  // 4 Classical Columns with Bases & Capitals
  [-1.8, -0.6, 0.6, 1.8].forEach(cx => {
    const colZ = bD / 2 + porticoD - 0.22;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.46), darkStoneMat);
    base.position.set(cx, 0.48, colZ);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, colH - 0.6, 16), stoneMat);
    shaft.position.set(cx, colH / 2 + 0.2, colZ);
    shaft.castShadow = true;
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), darkStoneMat);
    capital.position.set(cx, colH - 0.1, colZ);
    museumGroup.add(base, shaft, capital);
  });

  // Bronze Museum Double Doors
  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.08), bronzeMat);
  doors.position.set(0, 1.76, bD / 2 + 0.05);
  museumGroup.add(doors);

  // Broad Entrance Steps
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(5.6 - s * 0.3, 0.12, 1.8 - s * 0.2), darkStoneMat);
    step.position.set(0, (s + 0.5) * 0.12, bD / 2 + 0.8 + (2 - s) * 0.15);
    step.receiveShadow = true;
    museumGroup.add(step);
  }

  // Prominent Header Signboard: "MUSEUM / 博物館"
  const signTexture = createMuseumSignTexture();
  const signMat = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.4 });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.12), [
    darkStoneMat, darkStoneMat, darkStoneMat, darkStoneMat, signMat, darkStoneMat
  ]);
  signMesh.position.set(0, bH + 0.75, bD / 2 + 0.15);
  museumGroup.add(signMesh);

  group.add(museumGroup);

  // 4. OUTDOOR BRONZE SCULPTURE ON PLAZA APRON
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

  group.add(sculptureGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
