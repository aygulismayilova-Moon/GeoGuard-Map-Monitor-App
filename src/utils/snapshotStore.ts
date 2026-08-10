import { MapSnapshot, PlaceItem } from '../types';
import { captureGoogleMapSnapshot } from './mapImageCanvas';
import { saveSnapshotToFirestore, deleteSnapshotFromFirestore } from './firestoreService';

const STORAGE_KEY = 'geoguard_map_snapshots_v1';

function safeSaveToLocalStorage(allSnapshots: MapSnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSnapshots));
  } catch (e) {
    console.warn('LocalStorage quota limit reached, pruning older snapshot entries...', e);
    try {
      // Keep only most recent 12 snapshots in localStorage cache to prevent quota overflow
      const trimmed = allSnapshots.slice(0, 12);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err2) {
      console.warn('Failed to save to localStorage after trim:', err2);
    }
  }
}

export function getAllSnapshots(): MapSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read snapshots from localStorage', e);
    return [];
  }
}

export function getSnapshotsForPlace(placeId: string): MapSnapshot[] {
  const all = getAllSnapshots();
  return all.filter((s) => s.placeId === placeId);
}

export function saveSnapshot(snapshot: MapSnapshot): MapSnapshot[] {
  const all = getAllSnapshots();
  const existingIdx = all.findIndex((s) => s.id === snapshot.id);

  if (existingIdx >= 0) {
    all[existingIdx] = snapshot;
  } else {
    all.unshift(snapshot);
  }

  safeSaveToLocalStorage(all);
  saveSnapshotToFirestore(snapshot);

  return all;
}

export function deleteSnapshot(id: string): MapSnapshot[] {
  const all = getAllSnapshots().filter((s) => s.id !== id);
  safeSaveToLocalStorage(all);
  deleteSnapshotFromFirestore(id);

  return all;
}

/**
 * Initializes default historical baseline & today snapshots for sample places using real map imagery.
 */
export async function initializeSampleSnapshots(places: PlaceItem[]): Promise<MapSnapshot[]> {
  const existing = getAllSnapshots();
  if (existing.length > 0) return existing;

  const sampleSnapshots: MapSnapshot[] = [];

  for (const place of places) {
    // Determine event simulation based on place category
    let todayEvent: 'Construction' | 'Accident' | 'Deforestation' | 'Flood' = 'Construction';
    if (place.category?.includes('Traffic')) todayEvent = 'Accident';
    if (place.category?.includes('Forest')) todayEvent = 'Deforestation';
    if (place.category?.includes('Coastal')) todayEvent = 'Flood';

    // Baseline Image (Yesterday / Previous Date)
    const baselineImg = await captureGoogleMapSnapshot({
      placeName: place.place_name,
      eventType: 'Baseline',
      dateText: 'Jul 28, 2026 - Baseline',
      lat: place.latitude,
      lng: place.longitude,
      zoom: 16,
      mapType: 'satellite',
    });

    // Today's Image (With temporal change)
    const todayImg = await captureGoogleMapSnapshot({
      placeName: place.place_name,
      eventType: todayEvent,
      dateText: 'Aug 09, 2026 - Current',
      lat: place.latitude,
      lng: place.longitude,
      zoom: 16,
      mapType: 'satellite',
    });

    sampleSnapshots.push({
      id: `snap-${place.id}-baseline`,
      placeId: place.id,
      capturedAt: '2026-07-28T09:00:00Z',
      dateLabel: 'Baseline Survey (Jul 28, 2026)',
      isoDate: '2026-07-28',
      imageUrl: baselineImg,
      zoomLevel: 16,
      mapType: 'satellite',
      notes: 'Initial geospatial baseline inspection snapshot before ground changes.',
      lat: place.latitude,
      lng: place.longitude,
      eventOverlay: 'Baseline Survey',
    });

    sampleSnapshots.push({
      id: `snap-${place.id}-today`,
      placeId: place.id,
      capturedAt: '2026-08-09T10:15:00Z',
      dateLabel: 'Today (Aug 09, 2026)',
      isoDate: '2026-08-09',
      imageUrl: todayImg,
      zoomLevel: 16,
      mapType: 'satellite',
      notes: `Updated satellite inspection captured today. Noticeable change: ${todayEvent}.`,
      lat: place.latitude,
      lng: place.longitude,
      eventOverlay: todayEvent,
    });
  }

  safeSaveToLocalStorage(sampleSnapshots);
  return sampleSnapshots;
}
