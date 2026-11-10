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
 * WHAT: Bakes every static mesh's world transform into its geometry, de-duplicates
 * materials by value (not identity), and merges all geometry sharing the same material
 * + shadow flags into a single mesh. Opaque geometry merges town-wide; transparent
 * geometry merges per building so per-object depth sorting still behaves sensibly.
 *
 * Kinetic subtrees (Ferris wheel / carousel rotors) and any objects listed in
 * `keepDynamicNames` are left untouched so they can still be animated by name.
 */

const SKIPPED_MATERIAL_KEYS = new Set(['uuid', 'name', 'id', 'version', 'userData', '_listeners', 'isMaterial', 'type']);

function valueSignature(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  const t = typeof v;
  if (t === 'number' || t === 'boolean' || t === 'string') return String(v);
  if (t === 'function') return `fn${Math.random()}`; // custom shader hooks are never merged
  const obj = v as Record<string, unknown> & {
    isColor?: boolean; isTexture?: boolean; isVector2?: boolean; isVector3?: boolean;
    isEuler?: boolean; uuid?: string; getHexString?: () => string; x?: number; y?: number; z?: number;
  };
  if (obj.isColor && obj.getHexString) return `c${obj.getHexString()}`;
  if (obj.isTexture) return `t${obj.uuid}`;
  if (obj.isVector2) return `v${obj.x},${obj.y}`;
  if (obj.isVector3 || obj.isEuler) return `v${obj.x},${obj.y},${obj.z}`;
  if (Array.isArray(v)) return `[${v.map(valueSignature).join(',')}]`;
  if (Object.getPrototypeOf(v) === Object.prototype) {
    // Plain objects such as `defines` — compare by contents
    return `{${Object.keys(obj).sort().map((k) => `${k}:${valueSignature(obj[k])}`).join(',')}}`;
  }
  // Unknown object type (e.g. clipping planes) — never merge across identities
  return `o${Math.random()}`;
}

function materialSignature(mat: THREE.Material): string {
  // Animated / shared-by-reference materials opt out of value de-duplication
  if (mat.userData?.batchUnique) return `unique:${mat.uuid}`;
  const parts: string[] = [mat.type];
  const keys = Object.keys(mat).sort();
  for (const key of keys) {
    if (SKIPPED_MATERIAL_KEYS.has(key)) continue;
    parts.push(`${key}=${valueSignature((mat as unknown as Record<string, unknown>)[key])}`);
  }
  return parts.join('|');
}

function isUnderDynamicAncestor(obj: THREE.Object3D, root: THREE.Object3D, dynamicNames: Set<string>): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur && cur !== root) {
    if (dynamicNames.has(cur.name)) return true;
    if (!cur.visible) return true; // keep hidden objects as-is
    cur = cur.parent;
  }
  return false;
}

/** Converts a mesh's geometry into a world-space, indexed geometry with a uniform attribute layout. */
function prepareGeometry(mesh: THREE.Mesh, needsColor: boolean): THREE.BufferGeometry | null {
  const src = mesh.geometry;
  if (!src || !src.attributes.position) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', src.attributes.position.clone());

  if (src.attributes.normal) {
    geo.setAttribute('normal', src.attributes.normal.clone());
  }

  const vertCount = src.attributes.position.count;
  if (src.attributes.uv) {
    geo.setAttribute('uv', src.attributes.uv.clone());
  } else {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertCount * 2), 2));
  }

  if (needsColor) {
    if (src.attributes.color && src.attributes.color.itemSize === 3) {
      geo.setAttribute('color', src.attributes.color.clone());
    } else {
      const white = new Float32Array(vertCount * 3).fill(1);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(white, 3));
    }
  }

  // Respect draw ranges / multi-material groups are excluded upstream; build an index if missing
  let indexArr: number[];
  if (src.index) {
    indexArr = Array.from(src.index.array as ArrayLike<number>);
  } else {
    indexArr = Array.from({ length: vertCount }, (_, i) => i);
  }

  // Mirrored transforms (negative determinant) flip triangle winding — restore it
  if (mesh.matrixWorld.determinant() < 0) {
    for (let i = 0; i + 2 < indexArr.length; i += 3) {
      const tmp = indexArr[i + 1];
      indexArr[i + 1] = indexArr[i + 2];
      indexArr[i + 2] = tmp;
    }
  }
  geo.setIndex(indexArr);

  geo.applyMatrix4(mesh.matrixWorld);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

export interface BatchStats {
  meshesBefore: number;
  meshesAfter: number;
  uniqueMaterials: number;
}

export function batchStaticMeshes(
  root: THREE.Group,
  keepDynamicNames: string[] = []
): BatchStats {
  const dynamicNames = new Set(keepDynamicNames);
  root.updateMatrixWorld(true);

  const canonicalMaterials = new Map<string, THREE.Material>();
  const buckets = new Map<string, { material: THREE.Material; castShadow: boolean; receiveShadow: boolean; geos: THREE.BufferGeometry[] }>();
  const consumed: THREE.Mesh[] = [];
  let meshesBefore = 0;

  // Determine which top-level child (building / road tile) each mesh belongs to
  const topLevelOf = (obj: THREE.Object3D): THREE.Object3D => {
    let cur: THREE.Object3D = obj;
    while (cur.parent && cur.parent !== root) cur = cur.parent;
    return cur;
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshesBefore++;

    if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
    if ((mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
    if (Array.isArray(mesh.material)) return; // multi-material (e.g. 4-sided totem) stays as-is
    if (mesh.renderOrder !== 0 || !mesh.frustumCulled) return;
    if (mesh.geometry?.morphAttributes && Object.keys(mesh.geometry.morphAttributes).length > 0) return;
    if (isUnderDynamicAncestor(mesh, root, dynamicNames)) return;

    const mat = mesh.material as THREE.Material;
    const sig = materialSignature(mat);
    let canonical = canonicalMaterials.get(sig);
    if (!canonical) {
      canonical = mat;
      canonicalMaterials.set(sig, mat);
    }

    const needsColor = !!(canonical as THREE.MeshStandardMaterial).vertexColors;
    const geo = prepareGeometry(mesh, needsColor);
    if (!geo) return;

    const spatialKey = mat.transparent && !mat.userData?.batchGlobal ? topLevelOf(mesh).uuid : 'town';
    const bucketKey = `${sig}#${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}#${spatialKey}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = { material: canonical, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, geos: [] };
      buckets.set(bucketKey, bucket);
    }
    bucket.geos.push(geo);
    consumed.push(mesh);
  });

  // Detach consumed meshes (and free their CPU-side geometries — they were never uploaded)
  for (const mesh of consumed) {
    mesh.parent?.remove(mesh);
    mesh.geometry.dispose();
  }

  const batchGroup = new THREE.Group();
  batchGroup.name = `${root.name}_StaticBatch`;

  buckets.forEach((bucket) => {
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
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshesAfter++; });

  return { meshesBefore, meshesAfter, uniqueMaterials: canonicalMaterials.size };
}
