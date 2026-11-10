import { rtdb } from './firebase';
import {
  ref,
  set,
  update,
  get,
  remove,
  onValue,
  runTransaction,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';

/**
 * Resolves a path string or DatabaseReference into a DatabaseReference.
 * Strips accidental duplicate, leading, or trailing slashes and whitespace.
 */
export function resolveRef(pathOrRef: string | DatabaseReference): DatabaseReference {
  if (!pathOrRef) {
    throw new Error('[rtdbSafe] Invalid path or DatabaseReference provided: null/undefined/empty');
  }
  if (typeof pathOrRef === 'string') {
    const cleanPath = pathOrRef
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
    return ref(rtdb, cleanPath);
  }
  return pathOrRef;
}

/**
 * Recursively cleans an object or value for safe persistence in Firebase Realtime Database:
 * 1. Omit/strip all `undefined` properties from objects.
 * 2. Filter out `undefined` entries in arrays.
 * 3. Convert `NaN`, `Infinity`, `-Infinity` to `null` (preventing RTDB crash).
 * 4. Convert `Date` instances to numeric timestamps (.getTime()).
 * 5. Convert `Set` to Array and `Map` to Object.
 * 6. Honor custom `.toJSON()` methods.
 * 7. Safely break true circular references via active traversal stack while PRESERVING shared non-circular references (DAGs).
 */
export function deepClean<T>(data: T, activeStack = new Set<object>()): any {
  if (data === undefined) {
    return null;
  }
  if (data === null) {
    return null;
  }
  if (typeof data === 'number') {
    if (Number.isNaN(data) || !Number.isFinite(data)) {
      return null;
    }
    return data;
  }
  if (typeof data === 'string' || typeof data === 'boolean') {
    return data;
  }
  if (typeof data === 'bigint') {
    return Number(data);
  }
  if (typeof data === 'symbol' || typeof data === 'function') {
    return undefined;
  }
  if (data instanceof Date) {
    return data.getTime();
  }

  if (typeof data === 'object') {
    // Check for circular reference in the active ancestor stack
    if (activeStack.has(data as object)) {
      return null; // Break true recursion loop
    }
    activeStack.add(data as object);

    try {
      // Support custom toJSON() implementations (e.g. specialized models or third-party wrappers)
      if (typeof (data as any).toJSON === 'function') {
        return deepClean((data as any).toJSON(), activeStack);
      }

      // Convert Set to Array
      if (data instanceof Set) {
        const result: any[] = [];
        for (const item of data) {
          if (item === undefined) continue;
          const cleaned = deepClean(item, activeStack);
          if (cleaned !== undefined) {
            result.push(cleaned);
          }
        }
        return result;
      }

      // Convert Map to Record
      if (data instanceof Map) {
        const result: Record<string, any> = {};
        for (const [key, value] of data.entries()) {
          if (value === undefined) continue;
          const cleaned = deepClean(value, activeStack);
          if (cleaned !== undefined) {
            result[String(key)] = cleaned;
          }
        }
        return result;
      }

      // Array sanitization
      if (Array.isArray(data)) {
        const result: any[] = [];
        for (const item of data) {
          if (item === undefined) continue;
          const cleaned = deepClean(item, activeStack);
          if (cleaned !== undefined) {
            result.push(cleaned);
          }
        }
        return result;
      }

      // Plain Object sanitization
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(data as Record<string, any>)) {
        if (value === undefined) {
          continue;
        }
        const cleaned = deepClean(value, activeStack);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
      return result;
    } finally {
      // Pop from active traversal stack once children are completely processed
      // This allows shared non-circular references (DAGs) across siblings to be preserved!
      activeStack.delete(data as object);
    }
  }

  return data;
}

/**
 * Zero-error safe wrapper around RTDB `set()`.
 * Deeply strips `undefined` values before sending to Firebase.
 */
export async function safeSet<T>(pathOrRef: string | DatabaseReference, data: T): Promise<void> {
  const targetRef = resolveRef(pathOrRef);
  const cleanedData = deepClean(data);
  try {
    await set(targetRef, cleanedData);
  } catch (err: any) {
    console.error(`[rtdbSafe] safeSet error at ${targetRef.toString()}:`, err);
    throw err;
  }
}

/**
 * Zero-error safe wrapper around RTDB `update()`.
 * Deeply sanitizes updates object and strips any keys that evaluate to undefined.
 * Preserves `null` for intentional property deletions.
 * If all keys are stripped (empty update), safely no-ops.
 */
export async function safeUpdate<T extends object>(
  pathOrRef: string | DatabaseReference,
  updates: T
): Promise<void> {
  if (!pathOrRef || !updates || typeof updates !== 'object') return;
  const targetRef = resolveRef(pathOrRef);

  const cleanedUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (value === null) {
      cleanedUpdates[key] = null; // Explicit deletion in RTDB
      continue;
    }
    const cleaned = deepClean(value);
    if (cleaned !== undefined) {
      cleanedUpdates[key] = cleaned;
    }
  }

  if (Object.keys(cleanedUpdates).length === 0) {
    return;
  }

  try {
    await update(targetRef, cleanedUpdates);
  } catch (err: any) {
    console.error(`[rtdbSafe] safeUpdate error at ${targetRef.toString()}:`, err);
    throw err;
  }
}

/**
 * Isolated listener wrapper around RTDB `onValue()`.
 * Returns a clean `() => unsubscribe()` callback that detaches ONLY this specific listener.
 * NEVER calls `off()` or interferes with other listeners on the same path.
 */
export function safeSubscribe<T>(
  pathOrRef: string | DatabaseReference,
  callback: (data: T | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!pathOrRef) {
    return () => {};
  }
  const targetRef = resolveRef(pathOrRef);
  const unsubscribe = onValue(
    targetRef,
    (snapshot) => {
      try {
        const val = snapshot.exists() ? (snapshot.val() as T) : null;
        callback(val);
      } catch (cbErr: any) {
        console.error(`[rtdbSafe] Error in subscription callback on ${targetRef.toString()}:`, cbErr);
      }
    },
    (err) => {
      console.error(`[rtdbSafe] Subscription error on ${targetRef.toString()}:`, err);
      if (onError) {
        onError(err);
      }
    }
  );

  return () => {
    try {
      unsubscribe();
    } catch (unsubErr) {
      console.warn(`[rtdbSafe] Unsubscribe warning on ${targetRef.toString()}:`, unsubErr);
    }
  };
}

/**
 * Typed get helper with standardized error handling and null-checking.
 */
export async function safeGet<T>(pathOrRef: string | DatabaseReference): Promise<T | null> {
  const targetRef = resolveRef(pathOrRef);
  try {
    const snapshot = await get(targetRef);
    return snapshot.exists() ? (snapshot.val() as T) : null;
  } catch (err: any) {
    console.error(`[rtdbSafe] safeGet error on ${targetRef.toString()}:`, err);
    throw err;
  }
}

/**
 * Safe removal with error handling.
 */
export async function safeRemove(pathOrRef: string | DatabaseReference): Promise<void> {
  const targetRef = resolveRef(pathOrRef);
  try {
    await remove(targetRef);
  } catch (err: any) {
    console.error(`[rtdbSafe] safeRemove error on ${targetRef.toString()}:`, err);
    throw err;
  }
}

/**
 * Atomic transaction wrapper with automatic cleaning of returned objects.
 * Returning `undefined` from `updateFn` cleanly aborts the transaction.
 */
export async function safeTransaction<T>(
  pathOrRef: string | DatabaseReference,
  updateFn: (currentData: T | null) => T | undefined
): Promise<{ committed: boolean; snapshot: DataSnapshot | null; data: T | null }> {
  const targetRef = resolveRef(pathOrRef);
  try {
    const result = await runTransaction(targetRef, (current) => {
      const updated = updateFn(current as T | null);
      if (updated === undefined) {
        return undefined; // Clean abort
      }
      return deepClean(updated);
    });

    return {
      committed: result.committed,
      snapshot: result.snapshot,
      data: result.snapshot && result.snapshot.exists() ? (result.snapshot.val() as T) : null
    };
  } catch (err: any) {
    console.error(`[rtdbSafe] safeTransaction error on ${targetRef.toString()}:`, err);
    throw err;
  }
}

let serverTimeOffset = 0;
let isOffsetInitialized = false;

/**
 * Subscribes to Firebase RTDB's authoritative clock offset (.info/serverTimeOffset).
 * Automatically calculates difference between local device clock and server clock.
 */
export function initServerTimeSync(): void {
  if (isOffsetInitialized) return;
  isOffsetInitialized = true;
  try {
    const offsetRef = ref(rtdb, '.info/serverTimeOffset');
    onValue(offsetRef, (snap) => {
      serverTimeOffset = typeof snap.val() === 'number' ? snap.val() : 0;
    }, (err) => {
      console.warn('[rtdbSafe] Failed to sync server time offset:', err);
    });
  } catch (err) {
    console.warn('[rtdbSafe] Error initializing server time offset listener:', err);
  }
}

// Auto-initialize when module loads in browser environment
if (typeof window !== 'undefined') {
  initServerTimeSync();
}

/**
 * Returns current timestamp synchronized with Firebase server time.
 * Eliminates clock skew between host laptops and student iPads.
 */
export function getServerTime(): number {
  return Date.now() + serverTimeOffset;
}

export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

export function setServerTimeOffset(offsetMs: number): void {
  serverTimeOffset = offsetMs;
}

/**
 * School Wi-Fi & RTDB Bandwidth Governor (`bandwidthGovernor`)
 * Suppresses redundant telemetry packets when karts coast predictably on school Wi-Fi.
 */
export interface BandwidthTelemetryStats {
  packetsSent: number;
  packetsSuppressedByDelta: number;
  bytesSavedEstimate: number;
  currentSyncIntervalMs: number;
  networkProfile: 'OPTIMAL_LAN' | 'SCHOOL_WIFI_SAVER' | 'THROTTLED_LOW_BW';
}

class ClassroomBandwidthGovernor {
  private packetsSent = 0;
  private packetsSuppressed = 0;
  private bytesSaved = 0;
  private profile: 'OPTIMAL_LAN' | 'SCHOOL_WIFI_SAVER' | 'THROTTLED_LOW_BW' = 'SCHOOL_WIFI_SAVER';

  public setProfile(profile: 'OPTIMAL_LAN' | 'SCHOOL_WIFI_SAVER' | 'THROTTLED_LOW_BW'): void {
    this.profile = profile;
  }

  public getProfile() {
    return this.profile;
  }

  public getSyncIntervalMs(): number {
    if (this.profile === 'THROTTLED_LOW_BW') return 2400;
    if (this.profile === 'SCHOOL_WIFI_SAVER') return 1500;
    return 800;
  }

  public recordPacketSent(): void {
    this.packetsSent++;
  }

  public recordPacketSuppressed(estimatedBytes: number = 185): void {
    this.packetsSuppressed++;
    this.bytesSaved += estimatedBytes;
  }

  public getStats(): BandwidthTelemetryStats {
    return {
      packetsSent: this.packetsSent,
      packetsSuppressedByDelta: this.packetsSuppressed,
      bytesSavedEstimate: this.bytesSaved,
      currentSyncIntervalMs: this.getSyncIntervalMs(),
      networkProfile: this.profile,
    };
  }
}

export const bandwidthGovernor = new ClassroomBandwidthGovernor();
