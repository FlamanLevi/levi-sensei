import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Static Draw-Call Batcher for the procedural town.
 *
 * WHY: A generated town contains ~4,700 individual meshes (≈1,200 duplicate materials),
 * which means ~4,700 main-pass draw calls + ~1,200 shadow-pass draw calls every frame.
 * Classroom iPads are draw-call bound long before they are triangle bound (the whole
 * town is only ~90k triangles).
 *
 * WHAT:
 * 1. Bakes every static mesh's world transform into its geometry (including slicing
 *    multi-material geometry groups such as 4-sided sidewalk totems).
 * 2. De-duplicates materials by value — and when `bakeVertexColors` is enabled,
 *    quantizes roughness/metalness to 0.05 steps and bakes `mat.color` into vertex
 *    colors so differently colored static walls/props merge into one draw call.
 * 3. When `atlasUniqueTextMaps` is enabled, shelf-packs single-use CanvasTexture
 *    signs/totems/nameplates into 1–3 per-batch texture atlases and remaps UVs so
 *    ~80 unique sign draw calls collapse into 1–3 draw calls.
 * 4. Kinetic subtrees (Ferris wheel / carousel rotors) and any objects listed in
 *    `keepDynamicNames` are left untouched so they can still be animated by name.
 */

const SKIPPED_MATERIAL_KEYS = new Set([
  'uuid',
  'name',
  'id',
  'version',
  'userData',
  '_listeners',
  'isMaterial',
  'type',
]);

const SKIPPED_BAKE_MATERIAL_KEYS = new Set([
  ...SKIPPED_MATERIAL_KEYS,
  'color',
  'vertexColors',
  'roughness',
  'metalness',
  'envMapIntensity',
]);

export interface BatchStaticOptions {
  /** Omit castShadow/receiveShadow from bucket keys (ideal when shadows are off or on perimeter scenery). */
  ignoreShadowFlags?: boolean;
  /** Quantize roughness/metalness and bake mat.color into vertex colors for opaque MeshStandardMaterials. Default true. */
  bakeVertexColors?: boolean;
  /** Shelf-pack unique non-tiled CanvasTexture signs/totems/nameplates into per-batch texture atlases. Default false. */
  atlasUniqueTextMaps?: boolean;
}

export interface BatchStats {
  meshesBefore: number;
  meshesAfter: number;
  uniqueMaterials: number;
  atlasedTextures?: number;
  atlasPages?: number;
}

function quantizeStep(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function valueSignature(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  const t = typeof v;
  if (t === 'number' || t === 'boolean' || t === 'string') return String(v);
  if (t === 'function') return `fn${Math.random()}`; // custom shader hooks are never merged
  const obj = v as Record<string, unknown> & {
    isColor?: boolean;
    isTexture?: boolean;
    isVector2?: boolean;
    isVector3?: boolean;
    isEuler?: boolean;
    uuid?: string;
    getHexString?: () => string;
    x?: number;
    y?: number;
    z?: number;
  };
  if (obj.isColor && obj.getHexString) return `c${obj.getHexString()}`;
  if (obj.isTexture) return `t${obj.uuid}`;
  if (obj.isVector2) return `v${obj.x},${obj.y}`;
  if (obj.isVector3 || obj.isEuler) return `v${obj.x},${obj.y},${obj.z}`;
  if (Array.isArray(v)) return `[${v.map(valueSignature).join(',')}]`;
  if (Object.getPrototypeOf(v) === Object.prototype) {
    // Plain objects such as `defines` — compare by contents
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${k}:${valueSignature(obj[k])}`)
      .join(',')}}`;
  }
  // Unknown object type (e.g. clipping planes) — never merge across identities
  return `o${Math.random()}`;
}

function canBakeVertexColor(mat: THREE.Material): mat is THREE.MeshStandardMaterial {
  const std = mat as THREE.MeshStandardMaterial;
  if (!std.isMeshStandardMaterial) return false;
  if (std.transparent) return false;
  if (std.userData?.batchUnique || std.userData?.noVertexColorBake) return false;
  if (std.map?.userData?.noVertexColorBake) return false;
  if (std.emissiveMap) return false;
  const emissiveActive =
    (std.emissiveIntensity ?? 1) > 0 &&
    std.emissive &&
    (std.emissive.r > 0 || std.emissive.g > 0 || std.emissive.b > 0);
  if (emissiveActive) return false;
  if (std.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return false;
  return true;
}

function materialSignature(mat: THREE.Material, bakeVertexColors: boolean): { sig: string; baked: boolean } {
  // Animated / shared-by-reference materials opt out of value de-duplication
  if (mat.userData?.batchUnique) return { sig: `unique:${mat.uuid}`, baked: false };

  if (bakeVertexColors && canBakeVertexColor(mat)) {
    const qRough = quantizeStep(mat.roughness, 0.05);
    const qMetal = quantizeStep(mat.metalness, 0.05);
    const qEnv = quantizeStep(mat.envMapIntensity ?? 1, 0.1);
    const parts: string[] = [
      'BakedStd',
      `r=${qRough.toFixed(2)}`,
      `m=${qMetal.toFixed(2)}`,
      `e=${qEnv.toFixed(1)}`,
    ];
    const keys = Object.keys(mat).sort();
    for (const key of keys) {
      if (SKIPPED_BAKE_MATERIAL_KEYS.has(key)) continue;
      parts.push(`${key}=${valueSignature((mat as unknown as Record<string, unknown>)[key])}`);
    }
    return { sig: parts.join('|'), baked: true };
  }

  const parts: string[] = [mat.type];
  const keys = Object.keys(mat).sort();
  for (const key of keys) {
    if (SKIPPED_MATERIAL_KEYS.has(key)) continue;
    parts.push(`${key}=${valueSignature((mat as unknown as Record<string, unknown>)[key])}`);
  }
  return { sig: parts.join('|'), baked: false };
}

function isUnderDynamicAncestor(
  obj: THREE.Object3D,
  root: THREE.Object3D,
  dynamicNames: Set<string>
): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur && cur !== root) {
    if (dynamicNames.has(cur.name)) return true;
    if (!cur.visible) return true; // keep hidden objects as-is
    cur = cur.parent;
  }
  return false;
}

/**
 * Extracts a compacted world-space, indexed BufferGeometry for an optional index range
 * `[rangeStart, rangeStart + rangeCount)` (used for multi-material groups or draw ranges),
 * optionally baking `bakeColor` (linear RGB) into the vertex `color` attribute.
 */
function prepareSubGeometry(
  mesh: THREE.Mesh,
  needsColor: boolean,
  bakeColor: THREE.Color | null,
  rangeStart?: number,
  rangeCount?: number
): THREE.BufferGeometry | null {
  const src = mesh.geometry;
  const posAttr = src?.attributes.position;
  if (!src || !posAttr) return null;

  const vertCount = posAttr.count;
  const srcIndex = src.index;
  const totalIndexCount = srcIndex ? srcIndex.count : vertCount;

  const start = rangeStart !== undefined ? Math.max(0, rangeStart) : 0;
  const end =
    rangeCount !== undefined && Number.isFinite(rangeCount)
      ? Math.min(totalIndexCount, start + Math.max(0, rangeCount))
      : totalIndexCount;
  const sliceCount = end - start;
  if (sliceCount <= 0) return null;

  const isFullRange = start === 0 && end === totalIndexCount;
  const mirrored = mesh.matrixWorld.determinant() < 0;
  const srcNormal = src.attributes.normal;
  const srcUv = src.attributes.uv;
  const srcColor = src.attributes.color;
  const hasSrcColor = !!(srcColor && srcColor.itemSize >= 3);
  const br = bakeColor ? bakeColor.r : 1;
  const bg = bakeColor ? bakeColor.g : 1;
  const bb = bakeColor ? bakeColor.b : 1;

  const geo = new THREE.BufferGeometry();

  if (isFullRange) {
    geo.setAttribute('position', posAttr.clone());
    if (srcNormal) {
      geo.setAttribute('normal', srcNormal.clone());
    }
    if (srcUv) {
      geo.setAttribute('uv', srcUv.clone());
    } else {
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertCount * 2), 2));
    }

    if (needsColor || bakeColor) {
      const colArr = new Float32Array(vertCount * 3);
      if (hasSrcColor && srcColor) {
        for (let i = 0; i < vertCount; i++) {
          colArr[i * 3] = srcColor.getX(i) * br;
          colArr[i * 3 + 1] = srcColor.getY(i) * bg;
          colArr[i * 3 + 2] = srcColor.getZ(i) * bb;
        }
      } else {
        for (let i = 0; i < vertCount; i++) {
          colArr[i * 3] = br;
          colArr[i * 3 + 1] = bg;
          colArr[i * 3 + 2] = bb;
        }
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
    }

    const indexArr = new Uint32Array(totalIndexCount);
    if (srcIndex) {
      indexArr.set(srcIndex.array as ArrayLike<number>);
    } else {
      for (let i = 0; i < totalIndexCount; i++) indexArr[i] = i;
    }

    if (mirrored) {
      for (let i = 0; i + 2 < indexArr.length; i += 3) {
        const tmp = indexArr[i + 1];
        indexArr[i + 1] = indexArr[i + 2];
        indexArr[i + 2] = tmp;
      }
    }
    geo.setIndex(new THREE.BufferAttribute(indexArr, 1));
  } else {
    // Compact sub-range extraction: only copy vertices referenced by [start, end)
    const remap = new Int32Array(vertCount).fill(-1);
    const uniqueVerts: number[] = [];
    const indexArr = new Uint32Array(sliceCount);
    const rawIdx = srcIndex ? srcIndex.array : null;

    for (let i = 0; i < sliceCount; i++) {
      const origV = rawIdx ? (rawIdx[start + i] as number) : start + i;
      let mapped = remap[origV];
      if (mapped === -1) {
        mapped = uniqueVerts.length;
        remap[origV] = mapped;
        uniqueVerts.push(origV);
      }
      indexArr[i] = mapped;
    }

    if (mirrored) {
      for (let i = 0; i + 2 < indexArr.length; i += 3) {
        const tmp = indexArr[i + 1];
        indexArr[i + 1] = indexArr[i + 2];
        indexArr[i + 2] = tmp;
      }
    }

    const outCount = uniqueVerts.length;
    const posOut = new Float32Array(outCount * 3);
    const normOut = srcNormal ? new Float32Array(outCount * 3) : null;
    const uvOut = new Float32Array(outCount * 2);
    const colOut = needsColor || bakeColor ? new Float32Array(outCount * 3) : null;

    for (let i = 0; i < outCount; i++) {
      const v = uniqueVerts[i];
      posOut[i * 3] = posAttr.getX(v);
      posOut[i * 3 + 1] = posAttr.getY(v);
      posOut[i * 3 + 2] = posAttr.getZ(v);

      if (normOut && srcNormal) {
        normOut[i * 3] = srcNormal.getX(v);
        normOut[i * 3 + 1] = srcNormal.getY(v);
        normOut[i * 3 + 2] = srcNormal.getZ(v);
      }
      if (srcUv) {
        uvOut[i * 2] = srcUv.getX(v);
        uvOut[i * 2 + 1] = srcUv.getY(v);
      }
      if (colOut) {
        if (hasSrcColor && srcColor) {
          colOut[i * 3] = srcColor.getX(v) * br;
          colOut[i * 3 + 1] = srcColor.getY(v) * bg;
          colOut[i * 3 + 2] = srcColor.getZ(v) * bb;
        } else {
          colOut[i * 3] = br;
          colOut[i * 3 + 1] = bg;
          colOut[i * 3 + 2] = bb;
        }
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(posOut, 3));
    if (normOut) geo.setAttribute('normal', new THREE.Float32BufferAttribute(normOut, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvOut, 2));
    if (colOut) geo.setAttribute('color', new THREE.Float32BufferAttribute(colOut, 3));
    geo.setIndex(new THREE.BufferAttribute(indexArr, 1));
  }

  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

interface BatchBucket {
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
  geos: THREE.BufferGeometry[];
}

interface AtlasCandidate {
  bucketKey: string;
  bucket: BatchBucket;
  atlasGroupKey: string;
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  hasSelfEmissive: boolean;
  emissiveHex: number;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
  isBasic: boolean;
  side: THREE.Side;
  alphaTest: number;
}

const ATLAS_MAX_SIZE = 2048;
const ATLAS_MAX_TILE = 1024;
const ATLAS_PAD = 2;

function areUVsInUnitRange(geos: THREE.BufferGeometry[]): boolean {
  for (const g of geos) {
    const uv = g.attributes.uv;
    if (!uv) return false;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) return false;
    }
  }
  return true;
}

function classifyAtlasCandidate(
  bucketKey: string,
  bucket: BatchBucket,
  ignoreShadowFlags: boolean
): AtlasCandidate | null {
  if (typeof document === 'undefined') return null;

  const mat = bucket.material;
  if (mat.userData?.batchUnique) return null;
  if (mat.transparent) return null;
  if (mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return null;

  const isStd = (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial;
  const isBasic = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
  if (!isStd && !isBasic) return null;

  const map = (mat as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial).map;
  if (!map || !map.image) return null;
  if (!(map.image instanceof HTMLCanvasElement)) return null;
  if (!map.flipY) return null;
  if (map.userData?.isArchitecturalTex) return null;
  if (map.wrapS === THREE.RepeatWrapping || map.wrapT === THREE.RepeatWrapping) return null;
  if (
    map.repeat.x !== 1 ||
    map.repeat.y !== 1 ||
    map.offset.x !== 0 ||
    map.offset.y !== 0 ||
    map.rotation !== 0
  ) {
    return null;
  }

  const canvas = map.image;
  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0 || w > ATLAS_MAX_TILE || h > ATLAS_MAX_TILE) return null;

  let hasSelfEmissive = false;
  let emissiveHex = 0x000000;
  let emissiveIntensity = 0;
  let roughness = 0.45;
  let metalness = 0.05;

  if (isStd) {
    const std = mat as THREE.MeshStandardMaterial;
    if (
      std.bumpMap ||
      std.normalMap ||
      std.roughnessMap ||
      std.metalnessMap ||
      std.aoMap ||
      std.alphaMap ||
      std.displacementMap ||
      std.lightMap
    ) {
      return null;
    }
    if (std.emissiveMap && std.emissiveMap !== std.map) return null;
    if (std.emissiveMap === std.map && (std.emissiveIntensity ?? 0) > 0) {
      hasSelfEmissive = true;
      emissiveHex = std.emissive ? std.emissive.getHex() : 0xffffff;
      emissiveIntensity = std.emissiveIntensity <= 0.38 ? 0.3 : 0.55;
    } else if (
      (std.emissiveIntensity ?? 0) > 0 &&
      std.emissive &&
      (std.emissive.r > 0 || std.emissive.g > 0 || std.emissive.b > 0)
    ) {
      return null; // flat colored emissive without emissiveMap
    }
    // Keep glossy/matte signs together so ~40 building signs pack into 1 draw call;
    // keep roughness <= 0.5 so weatherAndTimeSystem signage night-glow still applies.
    roughness = std.roughness <= 0.55 ? 0.42 : 0.72;
    metalness = std.metalness <= 0.3 ? 0.05 : quantizeStep(std.metalness, 0.25);
  } else {
    const basic = mat as THREE.MeshBasicMaterial;
    if (basic.alphaMap || basic.aoMap || basic.lightMap || basic.specularMap) return null;
  }

  if (!areUVsInUnitRange(bucket.geos)) return null;

  const shadowKey = ignoreShadowFlags
    ? 'noshadow'
    : `${bucket.castShadow ? 1 : 0}${bucket.receiveShadow ? 1 : 0}`;
  const emKey = hasSelfEmissive
    ? `em:${emissiveHex.toString(16)}:${emissiveIntensity.toFixed(2)}`
    : 'noem';
  const alphaKey = mat.alphaTest > 0 ? `a${mat.alphaTest.toFixed(2)}` : 'a0';
  const atlasGroupKey = `${isBasic ? 'basic' : 'std'}|s${mat.side}|${alphaKey}|${emKey}|r${roughness.toFixed(2)}|m${metalness.toFixed(2)}|${shadowKey}`;

  return {
    bucketKey,
    bucket,
    atlasGroupKey,
    canvas,
    w,
    h,
    hasSelfEmissive,
    emissiveHex,
    emissiveIntensity,
    roughness,
    metalness,
    isBasic,
    side: mat.side,
    alphaTest: mat.alphaTest,
  };
}

function nextPow2(n: number): number {
  let p = 64;
  while (p < n && p < ATLAS_MAX_SIZE) p <<= 1;
  return Math.min(p, ATLAS_MAX_SIZE);
}

function ensureGeometryHasColor(geo: THREE.BufferGeometry, matColor: THREE.Color): void {
  if (geo.attributes.color) return;
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  const r = matColor.r;
  const g = matColor.g;
  const b = matColor.b;
  for (let i = 0; i < count; i++) {
    arr[i * 3] = r;
    arr[i * 3 + 1] = g;
    arr[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
}

function packAndAtlasBuckets(
  buckets: Map<string, BatchBucket>,
  ignoreShadowFlags: boolean
): { atlasedTextures: number; atlasPages: number; replacedMaterials: THREE.Material[] } {
  const groups = new Map<string, AtlasCandidate[]>();

  buckets.forEach((bucket, bucketKey) => {
    const cand = classifyAtlasCandidate(bucketKey, bucket, ignoreShadowFlags);
    if (!cand) return;
    let list = groups.get(cand.atlasGroupKey);
    if (!list) {
      list = [];
      groups.set(cand.atlasGroupKey, list);
    }
    list.push(cand);
  });

  let atlasedTextures = 0;
  let atlasPages = 0;
  const replacedMaterials: THREE.Material[] = [];

  groups.forEach((candidates, groupKey) => {
    if (candidates.length < 2) return;

    // Sort descending by height (then width) for tight shelf packing
    candidates.sort((a, b) => b.h - a.h || b.w - a.w);

    interface PlacedItem {
      cand: AtlasCandidate;
      x: number;
      y: number;
    }

    const pages: { items: PlacedItem[]; usedW: number; usedH: number }[] = [];
    let currentItems: PlacedItem[] = [];
    let shelfX = ATLAS_PAD;
    let shelfY = ATLAS_PAD;
    let shelfH = 0;
    let maxUsedW = 0;

    const flushPage = () => {
      if (currentItems.length === 0) return;
      pages.push({
        items: currentItems,
        usedW: maxUsedW,
        usedH: shelfY + shelfH + ATLAS_PAD,
      });
      currentItems = [];
      shelfX = ATLAS_PAD;
      shelfY = ATLAS_PAD;
      shelfH = 0;
      maxUsedW = 0;
    };

    for (const cand of candidates) {
      const neededW = cand.w + ATLAS_PAD;
      if (shelfX + neededW > ATLAS_MAX_SIZE) {
        shelfY += shelfH + ATLAS_PAD;
        shelfX = ATLAS_PAD;
        shelfH = 0;
      }
      if (shelfY + cand.h + ATLAS_PAD > ATLAS_MAX_SIZE) {
        flushPage();
      }
      currentItems.push({ cand, x: shelfX, y: shelfY });
      shelfX += cand.w + ATLAS_PAD;
      if (shelfX > maxUsedW) maxUsedW = shelfX;
      if (cand.h > shelfH) shelfH = cand.h;
    }
    flushPage();

    pages.forEach((page, pageIdx) => {
      if (page.items.length < 2) return; // Don't build a 1-tile atlas

      const atlasW = nextPow2(page.usedW);
      const atlasH = nextPow2(page.usedH);
      const atlasCanvas = document.createElement('canvas');
      atlasCanvas.width = atlasW;
      atlasCanvas.height = atlasH;
      const ctx = atlasCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, atlasW, atlasH);

      // Determine whether any item requires vertex colors
      let needsVertexColors = false;
      for (const { cand } of page.items) {
        const m = cand.bucket.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        if (m.vertexColors || (m.color && m.color.getHex() !== 0xffffff)) {
          needsVertexColors = true;
          break;
        }
        for (const g of cand.bucket.geos) {
          if (g.attributes.color) {
            needsVertexColors = true;
            break;
          }
        }
        if (needsVertexColors) break;
      }

      const mergedGeos: THREE.BufferGeometry[] = [];
      let castShadow = false;
      let receiveShadow = false;

      for (const { cand, x, y } of page.items) {
        const { canvas: srcCanvas, w, h, bucket } = cand;

        // Draw main tile + 1px edge extrusion into padding to prevent bilinear/mip bleeding
        ctx.drawImage(srcCanvas, x, y, w, h);
        // Top & bottom 1px extrusion
        ctx.drawImage(srcCanvas, 0, 0, w, 1, x, y - 1, w, 1);
        ctx.drawImage(srcCanvas, 0, h - 1, w, 1, x, y + h, w, 1);
        // Left & right 1px extrusion
        ctx.drawImage(srcCanvas, 0, 0, 1, h, x - 1, y, 1, h);
        ctx.drawImage(srcCanvas, w - 1, 0, 1, h, x + w, y, 1, h);

        // Remap UVs into [u0, u0+uSpan] x [v0, v0+vSpan] accounting for flipY=true
        const u0 = x / atlasW;
        const uSpan = w / atlasW;
        const v0 = 1 - (y + h) / atlasH;
        const vSpan = h / atlasH;

        const matColor = (bucket.material as THREE.MeshStandardMaterial).color ?? new THREE.Color(0xffffff);

        for (const geo of bucket.geos) {
          const uv = geo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            const u = Math.min(1, Math.max(0, uv.getX(i)));
            const v = Math.min(1, Math.max(0, uv.getY(i)));
            uv.setXY(i, u0 + u * uSpan, v0 + v * vSpan);
          }
          uv.needsUpdate = true;
          if (needsVertexColors) {
            ensureGeometryHasColor(geo, matColor);
          }
          mergedGeos.push(geo);
        }

        castShadow = castShadow || bucket.castShadow;
        receiveShadow = receiveShadow || bucket.receiveShadow;
        replacedMaterials.push(bucket.material);
        buckets.delete(cand.bucketKey);
        atlasedTextures++;
      }

      // Per-batch atlas texture: intentionally NOT marked isSharedResource so disposeObject3D frees it!
      const atlasTex = new THREE.CanvasTexture(atlasCanvas);
      atlasTex.colorSpace = THREE.SRGBColorSpace;
      atlasTex.anisotropy = 4;
      atlasTex.needsUpdate = true;

      const rep = page.items[0].cand;
      let atlasMat: THREE.Material;
      if (rep.isBasic) {
        atlasMat = new THREE.MeshBasicMaterial({
          map: atlasTex,
          color: 0xffffff,
          vertexColors: needsVertexColors,
          side: rep.side,
          alphaTest: rep.alphaTest,
        });
      } else {
        atlasMat = new THREE.MeshStandardMaterial({
          map: atlasTex,
          color: 0xffffff,
          vertexColors: needsVertexColors,
          roughness: rep.roughness,
          metalness: rep.metalness,
          side: rep.side,
          alphaTest: rep.alphaTest,
          ...(rep.hasSelfEmissive
            ? {
                emissive: new THREE.Color(rep.emissiveHex),
                emissiveMap: atlasTex,
                emissiveIntensity: rep.emissiveIntensity,
              }
            : {}),
        });
      }

      buckets.set(`__atlas__${groupKey}#${pageIdx}`, {
        material: atlasMat,
        castShadow: ignoreShadowFlags ? false : castShadow,
        receiveShadow,
        geos: mergedGeos,
      });
      atlasPages++;
    });
  });

  return { atlasedTextures, atlasPages, replacedMaterials };
}

export function batchStaticMeshes(
  root: THREE.Group,
  keepDynamicNames: string[] = [],
  options: BatchStaticOptions = {}
): BatchStats {
  const ignoreShadowFlags = options.ignoreShadowFlags ?? false;
  const bakeVertexColors = options.bakeVertexColors ?? true;
  const atlasUniqueTextMaps = options.atlasUniqueTextMaps ?? false;

  const dynamicNames = new Set(keepDynamicNames);
  root.updateMatrixWorld(true);

  const canonicalMaterials = new Map<string, THREE.Material>();
  const createdCanonicalMaterials: THREE.Material[] = [];
  const buckets = new Map<string, BatchBucket>();
  const consumed: THREE.Mesh[] = [];
  let meshesBefore = 0;

  // Determine which top-level child (building / road tile) each mesh belongs to
  const topLevelOf = (obj: THREE.Object3D): THREE.Object3D => {
    let cur: THREE.Object3D = obj;
    while (cur.parent && cur.parent !== root) cur = cur.parent;
    return cur;
  };

  const getOrCreateCanonical = (
    mat: THREE.Material
  ): { sig: string; canonical: THREE.Material; bakeColor: THREE.Color | null } => {
    const { sig, baked } = materialSignature(mat, bakeVertexColors);
    let canonical = canonicalMaterials.get(sig);
    if (!canonical) {
      if (baked) {
        const std = mat as THREE.MeshStandardMaterial;
        const cloned = std.clone();
        cloned.color.setHex(0xffffff);
        cloned.vertexColors = true;
        cloned.roughness = quantizeStep(std.roughness, 0.05);
        cloned.metalness = quantizeStep(std.metalness, 0.05);
        cloned.envMapIntensity = quantizeStep(std.envMapIntensity ?? 1, 0.1);
        cloned.userData = { ...std.userData };
        delete cloned.userData.isSharedResource;
        canonical = cloned;
        createdCanonicalMaterials.push(cloned);
      } else {
        canonical = mat;
      }
      canonicalMaterials.set(sig, canonical);
    }
    const bakeColor = baked ? (mat as THREE.MeshStandardMaterial).color : null;
    return { sig, canonical, bakeColor };
  };

  const addToBucket = (
    mesh: THREE.Mesh,
    mat: THREE.Material,
    sig: string,
    canonical: THREE.Material,
    geo: THREE.BufferGeometry
  ) => {
    const spatialKey =
      mat.transparent && !mat.userData?.batchGlobal ? topLevelOf(mesh).uuid : 'town';
    const bucketKey = ignoreShadowFlags
      ? `${sig}#${spatialKey}`
      : `${sig}#${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}#${spatialKey}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        material: canonical,
        castShadow: ignoreShadowFlags ? false : mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
        geos: [],
      };
      buckets.set(bucketKey, bucket);
    } else if (ignoreShadowFlags) {
      bucket.receiveShadow = bucket.receiveShadow || mesh.receiveShadow;
    }
    bucket.geos.push(geo);
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshesBefore++;

    if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
    if ((mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
    if (mesh.renderOrder !== 0 || !mesh.frustumCulled) return;
    if (mesh.geometry?.morphAttributes && Object.keys(mesh.geometry.morphAttributes).length > 0) {
      return;
    }
    if (isUnderDynamicAncestor(mesh, root, dynamicNames)) return;

    const src = mesh.geometry;
    if (!src || !src.attributes.position) return;

    if (Array.isArray(mesh.material)) {
      const groups = src.groups;
      if (!groups || groups.length === 0) return;

      // Validate all referenced group materials before slicing so we never half-consume a mesh
      const staged: {
        mat: THREE.Material;
        sig: string;
        canonical: THREE.Material;
        geo: THREE.BufferGeometry;
      }[] = [];

      for (const grp of groups) {
        if (grp.count <= 0) continue;
        const mat = mesh.material[grp.materialIndex ?? 0];
        if (!mat) {
          staged.forEach((s) => s.geo.dispose());
          return;
        }
        const { sig, canonical, bakeColor } = getOrCreateCanonical(mat);
        const needsColor = !!(canonical as THREE.MeshStandardMaterial).vertexColors;
        const subGeo = prepareSubGeometry(mesh, needsColor, bakeColor, grp.start, grp.count);
        if (!subGeo) {
          staged.forEach((s) => s.geo.dispose());
          return;
        }
        staged.push({ mat, sig, canonical, geo: subGeo });
      }

      if (staged.length === 0) return;
      for (const s of staged) {
        addToBucket(mesh, s.mat, s.sig, s.canonical, s.geo);
      }
      consumed.push(mesh);
      return;
    }

    const mat = mesh.material as THREE.Material;
    if (!mat) return;
    const { sig, canonical, bakeColor } = getOrCreateCanonical(mat);
    const needsColor = !!(canonical as THREE.MeshStandardMaterial).vertexColors;
    const dr = src.drawRange;
    const hasDrawRange = dr && (dr.start !== 0 || Number.isFinite(dr.count));
    const geo = prepareSubGeometry(
      mesh,
      needsColor,
      bakeColor,
      hasDrawRange ? dr.start : undefined,
      hasDrawRange ? dr.count : undefined
    );
    if (!geo) return;

    addToBucket(mesh, mat, sig, canonical, geo);
    consumed.push(mesh);
  });

  // Collect consumed geometries & materials, then detach consumed meshes
  const consumedGeos = new Set<THREE.BufferGeometry>();
  const consumedMats = new Set<THREE.Material>();
  for (const mesh of consumed) {
    consumedGeos.add(mesh.geometry);
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) if (m) consumedMats.add(m);
    } else if (mesh.material) {
      consumedMats.add(mesh.material);
    }
    mesh.parent?.remove(mesh);
  }
  for (const cm of createdCanonicalMaterials) {
    consumedMats.add(cm);
  }

  // Optional per-batch texture atlasing of single-use CanvasTexture signs/totems/nameplates
  let atlasedTextures = 0;
  let atlasPages = 0;
  if (atlasUniqueTextMaps) {
    const atlasRes = packAndAtlasBuckets(buckets, ignoreShadowFlags);
    atlasedTextures = atlasRes.atlasedTextures;
    atlasPages = atlasRes.atlasPages;
    for (const rm of atlasRes.replacedMaterials) {
      consumedMats.add(rm);
    }
  }

  // Track geometries & materials still referenced by surviving unbatched meshes
  const survivingGeos = new Set<THREE.BufferGeometry>();
  const survivingMats = new Set<THREE.Material>();
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.geometry) survivingGeos.add(m.geometry);
    if (Array.isArray(m.material)) {
      for (const mat of m.material) if (mat) survivingMats.add(mat);
    } else if (m.material) {
      survivingMats.add(m.material);
    }
  });

  const batchGroup = new THREE.Group();
  batchGroup.name = `${root.name}_StaticBatch`;

  buckets.forEach((bucket) => {
    survivingMats.add(bucket.material);
    const merged = bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
    if (!merged) {
      // Attribute layouts could not be merged — fall back to individual meshes
      for (const g of bucket.geos) {
        const m = new THREE.Mesh(g, bucket.material);
        m.castShadow = bucket.castShadow;
        m.receiveShadow = bucket.receiveShadow;
        batchGroup.add(m);
      }
      return;
    }
    if (merged !== bucket.geos[0]) bucket.geos.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const m = new THREE.Mesh(merged, bucket.material);
    m.castShadow = bucket.castShadow;
    m.receiveShadow = bucket.receiveShadow;
    m.matrixAutoUpdate = false;
    batchGroup.add(m);
  });

  // Dispose only consumed geometries & non-canonical materials that are neither surviving nor shared
  consumedGeos.forEach((g) => {
    if (!survivingGeos.has(g) && !g.userData?.isSharedResource) {
      g.dispose();
    }
  });
  consumedMats.forEach((m) => {
    if (!survivingMats.has(m) && !m.userData?.isSharedResource) {
      m.dispose();
    }
  });

  root.add(batchGroup);
  batchGroup.updateMatrixWorld(true);

  // Prune now-empty static groups so scene traversal stays cheap
  const prune = (obj: THREE.Object3D) => {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      const child = obj.children[i];
      prune(child);
      if (
        child.type === 'Group' &&
        child.children.length === 0 &&
        !dynamicNames.has(child.name) &&
        child !== batchGroup
      ) {
        obj.remove(child);
      }
    }
  };
  prune(root);

  let meshesAfter = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshesAfter++;
  });

  return {
    meshesBefore,
    meshesAfter,
    uniqueMaterials: buckets.size,
    atlasedTextures,
    atlasPages,
  };
}
