import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  disableNetwork,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PlaceItem, MapSnapshot, AccidentEvent, IncidentAlarm } from '../types';

const PLACES_COLLECTION = 'places';
const SNAPSHOTS_COLLECTION = 'snapshots';
const ACCIDENTS_COLLECTION = 'accidents';
const ALARMS_COLLECTION = 'alarms';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let isQuotaExceeded = false;
if (typeof window !== 'undefined' && localStorage.getItem('firestore_quota_exceeded') === 'true') {
  isQuotaExceeded = true;
  try {
    disableNetwork(db).catch(() => {});
  } catch (_) {}
}

function isQuotaError(error: any): boolean {
  if (!error) return false;
  const str = String(error?.message || error?.code || error || '');
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded') ||
    error?.code === 'resource-exhausted'
  );
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

function handleFirestoreError(
  actionName: string,
  error: any,
  operationType: OperationType = OperationType.GET,
  path: string | null = null
) {
  if (isQuotaError(error)) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      try {
        localStorage.setItem('firestore_quota_exceeded', 'true');
      } catch (_) {}
      console.warn(
        `[Firestore Notice] Project free tier quota limit reached during ${actionName}. Disabling Firestore network to run smoothly in local mode.`
      );
      try {
        disableNetwork(db).catch(() => {});
      } catch (_) {}
    }
    return;
  }

  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.error(`Error in ${actionName}:`, JSON.stringify(errInfo));
}

/**
 * Subscribe to real-time updates for Places collection
 */
export function subscribePlaces(onPlacesChanged: (places: PlaceItem[]) => void): () => void {
  if (isQuotaExceeded) return () => {};
  const colRef = collection(db, PLACES_COLLECTION);
  let unsubFn: (() => void) | null = null;

  try {
    unsubFn = onSnapshot(
      colRef,
      (snapshot) => {
        const places: PlaceItem[] = [];
        snapshot.forEach((docSnap) => {
          places.push(docSnap.data() as PlaceItem);
        });
        onPlacesChanged(places);
      },
      (error) => {
        handleFirestoreError('subscribePlaces', error, OperationType.GET, PLACES_COLLECTION);
        if (unsubFn) {
          try { unsubFn(); } catch (_) {}
        }
      }
    );
  } catch (err) {
    handleFirestoreError('subscribePlaces init', err, OperationType.GET, PLACES_COLLECTION);
  }

  return () => {
    if (unsubFn) {
      try { unsubFn(); } catch (_) {}
    }
  };
}

/**
 * Save single place item to Firestore
 */
export async function savePlaceToFirestore(place: PlaceItem): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, PLACES_COLLECTION, place.id);
    await setDoc(docRef, sanitizeForFirestore(place), { merge: true });
  } catch (error) {
    handleFirestoreError('savePlaceToFirestore', error, OperationType.WRITE, `${PLACES_COLLECTION}/${place.id}`);
  }
}

/**
 * Save multiple places to Firestore in batch
 */
export async function savePlacesToFirestore(places: PlaceItem[]): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const batch = writeBatch(db);
    places.forEach((place) => {
      const docRef = doc(db, PLACES_COLLECTION, place.id);
      batch.set(docRef, sanitizeForFirestore(place), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError('savePlacesToFirestore', error, OperationType.WRITE, PLACES_COLLECTION);
  }
}

/**
 * Delete a place from Firestore
 */
export async function deletePlaceFromFirestore(placeId: string): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, PLACES_COLLECTION, placeId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError('deletePlaceFromFirestore', error, OperationType.DELETE, `${PLACES_COLLECTION}/${placeId}`);
  }
}

/**
 * Subscribe to real-time updates for Snapshots collection
 */
export function subscribeSnapshots(onSnapshotsChanged: (snapshots: MapSnapshot[]) => void): () => void {
  if (isQuotaExceeded) return () => {};
  const colRef = collection(db, SNAPSHOTS_COLLECTION);
  let unsubFn: (() => void) | null = null;

  try {
    unsubFn = onSnapshot(
      colRef,
      (snapshot) => {
        const snapshots: MapSnapshot[] = [];
        snapshot.forEach((docSnap) => {
          snapshots.push(docSnap.data() as MapSnapshot);
        });
        // Sort newest first
        snapshots.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
        onSnapshotsChanged(snapshots);
      },
      (error) => {
        handleFirestoreError('subscribeSnapshots', error, OperationType.GET, SNAPSHOTS_COLLECTION);
        if (unsubFn) {
          try { unsubFn(); } catch (_) {}
        }
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeSnapshots init', err, OperationType.GET, SNAPSHOTS_COLLECTION);
  }

  return () => {
    if (unsubFn) {
      try { unsubFn(); } catch (_) {}
    }
  };
}

/**
 * Save a snapshot to Firestore
 */
export async function saveSnapshotToFirestore(snapshot: MapSnapshot): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, SNAPSHOTS_COLLECTION, snapshot.id);
    await setDoc(docRef, sanitizeForFirestore(snapshot), { merge: true });
  } catch (error) {
    handleFirestoreError('saveSnapshotToFirestore', error, OperationType.WRITE, `${SNAPSHOTS_COLLECTION}/${snapshot.id}`);
  }
}

/**
 * Delete a snapshot from Firestore
 */
export async function deleteSnapshotFromFirestore(snapshotId: string): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, SNAPSHOTS_COLLECTION, snapshotId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError('deleteSnapshotFromFirestore', error, OperationType.DELETE, `${SNAPSHOTS_COLLECTION}/${snapshotId}`);
  }
}

/**
 * Subscribe to real-time updates for Accident Events
 */
export function subscribeAccidentEvents(onEventsChanged: (events: AccidentEvent[]) => void): () => void {
  if (isQuotaExceeded) return () => {};
  const colRef = collection(db, ACCIDENTS_COLLECTION);
  let unsubFn: (() => void) | null = null;

  try {
    unsubFn = onSnapshot(
      colRef,
      (snapshot) => {
        const events: AccidentEvent[] = [];
        snapshot.forEach((docSnap) => {
          events.push(docSnap.data() as AccidentEvent);
        });
        events.sort((a, b) => b.timestamp - a.timestamp);
        onEventsChanged(events);
      },
      (error) => {
        handleFirestoreError('subscribeAccidentEvents', error, OperationType.GET, ACCIDENTS_COLLECTION);
        if (unsubFn) {
          try { unsubFn(); } catch (_) {}
        }
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeAccidentEvents init', err, OperationType.GET, ACCIDENTS_COLLECTION);
  }

  return () => {
    if (unsubFn) {
      try { unsubFn(); } catch (_) {}
    }
  };
}

export async function saveAccidentEventToFirestore(event: AccidentEvent): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, ACCIDENTS_COLLECTION, event.id);
    await setDoc(docRef, sanitizeForFirestore(event), { merge: true });
  } catch (error) {
    handleFirestoreError('saveAccidentEventToFirestore', error, OperationType.WRITE, `${ACCIDENTS_COLLECTION}/${event.id}`);
  }
}

export async function deleteAccidentEventFromFirestore(eventId: string): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, ACCIDENTS_COLLECTION, eventId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError('deleteAccidentEventFromFirestore', error, OperationType.DELETE, `${ACCIDENTS_COLLECTION}/${eventId}`);
  }
}

/**
 * Subscribe to real-time updates for Incident Alarms
 */
export function subscribeIncidentAlarms(onAlarmsChanged: (alarms: IncidentAlarm[]) => void): () => void {
  if (isQuotaExceeded) return () => {};
  const colRef = collection(db, ALARMS_COLLECTION);
  let unsubFn: (() => void) | null = null;

  try {
    unsubFn = onSnapshot(
      colRef,
      (snapshot) => {
        const alarms: IncidentAlarm[] = [];
        snapshot.forEach((docSnap) => {
          alarms.push(docSnap.data() as IncidentAlarm);
        });
        onAlarmsChanged(alarms);
      },
      (error) => {
        handleFirestoreError('subscribeIncidentAlarms', error, OperationType.GET, ALARMS_COLLECTION);
        if (unsubFn) {
          try { unsubFn(); } catch (_) {}
        }
      }
    );
  } catch (err) {
    handleFirestoreError('subscribeIncidentAlarms init', err, OperationType.GET, ALARMS_COLLECTION);
  }

  return () => {
    if (unsubFn) {
      try { unsubFn(); } catch (_) {}
    }
  };
}

export async function saveIncidentAlarmToFirestore(alarm: IncidentAlarm): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, ALARMS_COLLECTION, alarm.id);
    await setDoc(docRef, sanitizeForFirestore(alarm), { merge: true });
  } catch (error) {
    handleFirestoreError('saveIncidentAlarmToFirestore', error, OperationType.WRITE, `${ALARMS_COLLECTION}/${alarm.id}`);
  }
}

export async function deleteIncidentAlarmFromFirestore(alarmId: string): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, ALARMS_COLLECTION, alarmId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError('deleteIncidentAlarmFromFirestore', error, OperationType.DELETE, `${ALARMS_COLLECTION}/${alarmId}`);
  }
}
