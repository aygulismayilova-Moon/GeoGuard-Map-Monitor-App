import { MapSnapshot, PlaceItem } from '../types';
import { generateSyntheticMapSnapshot } from './mapImageCanvas';
import { saveSnapshotToFirestore, deleteSnapshotFromFirestore } from './firestoreService';

const STORAGE_KEY = 'geoguard_map_snapshots_v1';

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

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save snapshot to localStorage', e);
  }

  saveSnapshotToFirestore(snapshot);

  return all;
}

export function deleteSnapshot(id: string): MapSnapshot[] {
  const all = getAllSnapshots().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to delete snapshot from localStorage', e);
  }

  deleteSnapshotFromFirestore(id);

  return all;
}

/**
 * Initializes default historical baseline & today snapshots for sample places.
 */
export function initializeSampleSnapshots(places: PlaceItem[]): MapSnapshot[] {
  const existing = getAllSnapshots();
  if (existing.length > 0) return existing;

  const sampleSnapshots: MapSnapshot[] = [];

  places.forEach((place) => {
    // Determine event simulation based on place category
    let todayEvent: 'Construction' | 'Accident' | 'Deforestation' | 'Flood' = 'Construction';
    if (place.category?.includes('Traffic')) todayEvent = 'Accident';
    if (place.category?.includes('Forest')) todayEvent = 'Deforestation';
    if (place.category?.includes('Coastal')) todayEvent = 'Flood';

    // Baseline Image (Yesterday / Previous Date)
    const baselineImg = generateSyntheticMapSnapshot({
      placeName: place.place_name,
      eventType: 'Baseline',
      dateText: 'Jul 28, 2026 - Baseline',
      lat: place.latitude,
      lng: place.longitude,
      zoom: 16,
      mapType: 'satellite',
    });

    // Today's Image (With temporal change)
    const todayImg = generateSyntheticMapSnapshot({
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
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSnapshots));
  } catch (e) {
    console.error('Failed to seed sample snapshots', e);
  }

  return sampleSnapshots;
}
