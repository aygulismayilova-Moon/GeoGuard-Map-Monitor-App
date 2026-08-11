import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlaceItem, MapSnapshot, AccidentEvent, IncidentAlarm } from './types';
import { INITIAL_PLACES, SAMPLE_CSV_TEXT } from './data/samplePlaces';
import { DEFAULT_ALARMS, DEFAULT_ACCIDENT_EVENTS } from './data/sampleAccidentsAndAlarms';
import {
  getAllSnapshots,
  getSnapshotsForPlace,
  saveSnapshot,
  deleteSnapshot,
  initializeSampleSnapshots,
} from './utils/snapshotStore';
import {
  subscribePlaces,
  savePlacesToFirestore,
  savePlaceToFirestore,
  deletePlaceFromFirestore,
  subscribeSnapshots,
  saveSnapshotToFirestore,
  subscribeAccidentEvents,
  saveAccidentEventToFirestore,
  deleteAccidentEventFromFirestore,
  subscribeIncidentAlarms,
  saveIncidentAlarmToFirestore,
  deleteIncidentAlarmFromFirestore,
} from './utils/firestoreService';

import { Header } from './components/Header';
import { PlaceGrid } from './components/PlaceGrid';
import { GoogleMapView } from './components/GoogleMapView';
import { SnapshotManager } from './components/SnapshotManager';
import { RecentLocationsSidebar } from './components/RecentLocationsSidebar';
import { Dashboard } from './components/Dashboard';
import { CsvUploadModal } from './components/CsvUploadModal';
import { ApiKeyHelpModal } from './components/ApiKeyHelpModal';
import { AddPlaceModal } from './components/AddPlaceModal';
import { AccidentScannerModal } from './components/AccidentScannerModal';
import { MapPin, Info, ArrowDown, Sparkles, Building2, Layers } from 'lucide-react';

const PLACES_STORAGE_KEY = 'geoguard_places_dataset_v1';
const ALARMS_STORAGE_KEY = 'geoguard_alarms_dataset_v1';
const ACCIDENTS_STORAGE_KEY = 'geoguard_accidents_dataset_v1';
const RECENT_PLACES_KEY = 'geoguard_recent_places_v1';

export default function App() {
  // Places state
  const [places, setPlaces] = useState<PlaceItem[]>(() => {
    try {
      const saved = localStorage.getItem(PLACES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load places from storage', e);
    }
    return INITIAL_PLACES;
  });

  // Selected Place
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(() => {
    return places.length > 0 ? places[0].id : '';
  });

  // Recent Visited Places State (Up to 5)
  const [recentPlaceIds, setRecentPlaceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_PLACES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load recent places', e);
    }
    return places.length > 0 ? [places[0].id] : [];
  });

  // Snapshots State
  const [snapshots, setSnapshots] = useState<MapSnapshot[]>([]);

  // Accident Events & Alarms State with Local Storage persistence
  const [accidentEvents, setAccidentEvents] = useState<AccidentEvent[]>(() => {
    try {
      const saved = localStorage.getItem(ACCIDENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load accidents from storage', e);
    }
    return DEFAULT_ACCIDENT_EVENTS;
  });

  const [alarms, setAlarms] = useState<IncidentAlarm[]>(() => {
    try {
      const saved = localStorage.getItem(ALARMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load alarms from storage', e);
    }
    return DEFAULT_ALARMS;
  });

  // API Key Status
  const [hasGoogleMapsKey, setHasGoogleMapsKey] = useState<boolean>(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState<boolean>(false);
  const [isApiKeyHelpModalOpen, setIsApiKeyHelpModalOpen] = useState<boolean>(false);
  const [isAccidentScannerOpen, setIsAccidentScannerOpen] = useState<boolean>(false);

  // Category Filter state for Dashboard integration
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Section refs for smooth scroll
  const mapViewRef = useRef<HTMLDivElement>(null);
  const placeGridRef = useRef<HTMLDivElement>(null);

  const handleSelectCategoryFilter = (cat: string) => {
    setCategoryFilter(cat);
    if (placeGridRef.current) {
      placeGridRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initialize Snapshots and API status
  useEffect(() => {
    // Check keys via backend health
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasGeminiKey(Boolean(data.hasGeminiKey));
        setHasGoogleMapsKey(Boolean(data.hasGoogleMapsKey));
      })
      .catch((err) => {
        console.warn('Health check warning', err);
        const mapKey =
          process.env.GOOGLE_MAPS_PLATFORM_KEY ||
          (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY;
        setHasGoogleMapsKey(Boolean(mapKey));
        setHasGeminiKey(true);
      });

    // Seed initial sample snapshots for demo experience
    initializeSampleSnapshots(places).then((initialSnaps) => {
      setSnapshots(initialSnaps);
    });

    // Subscribe to Firestore for real-time Sync
    const unsubPlaces = subscribePlaces((remotePlaces) => {
      if (remotePlaces && remotePlaces.length > 0) {
        setPlaces(remotePlaces);
      }
    });

    const unsubSnapshots = subscribeSnapshots((remoteSnapshots) => {
      if (remoteSnapshots && remoteSnapshots.length > 0) {
        setSnapshots(remoteSnapshots);
      }
    });

    const unsubAccidents = subscribeAccidentEvents((remoteEvents) => {
      if (remoteEvents && remoteEvents.length > 0) {
        setAccidentEvents(remoteEvents);
        try {
          localStorage.setItem(ACCIDENTS_STORAGE_KEY, JSON.stringify(remoteEvents));
        } catch (_) {}
      }
    });

    const unsubAlarms = subscribeIncidentAlarms((remoteAlarms) => {
      if (remoteAlarms && remoteAlarms.length > 0) {
        setAlarms(remoteAlarms);
        try {
          localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(remoteAlarms));
        } catch (_) {}
      }
    });

    return () => {
      unsubPlaces();
      unsubSnapshots();
      unsubAccidents();
      unsubAlarms();
    };
  }, []);


  // Save places to localStorage & Firestore
  const updatePlaces = (newPlaces: PlaceItem[]) => {
    setPlaces(newPlaces);
    try {
      localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(newPlaces));
    } catch (e) {
      console.error('Failed to save places to localStorage', e);
    }
    savePlacesToFirestore(newPlaces);
  };

  // Currently Selected Place Object
  const selectedPlace = useMemo(() => {
    return places.find((p) => p.id === selectedPlaceId) || places[0] || null;
  }, [places, selectedPlaceId]);

  // Snapshots for selected place
  const selectedPlaceSnapshots = useMemo(() => {
    if (!selectedPlace) return [];
    return snapshots.filter((s) => s.placeId === selectedPlace.id);
  }, [snapshots, selectedPlace]);

  // Snapshots count map by place ID
  const snapshotsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    snapshots.forEach((s) => {
      map[s.placeId] = (map[s.placeId] || 0) + 1;
    });
    return map;
  }, [snapshots]);

  // Add location to recent visited places history (max 5)
  const addToRecentPlaces = (id: string) => {
    setRecentPlaceIds((prev) => {
      const filtered = prev.filter((itemId) => itemId !== id);
      const updated = [id, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent places', e);
      }
      return updated;
    });
  };

  // Clear recent places history
  const handleClearRecent = () => {
    setRecentPlaceIds([]);
    try {
      localStorage.removeItem(RECENT_PLACES_KEY);
    } catch (_) {}
  };

  // Select Place, add to recent history, and scroll down to map inspector
  const handleSelectPlace = (place: PlaceItem) => {
    setSelectedPlaceId(place.id);
    addToRecentPlaces(place.id);

    // Smooth scroll down to map inspector
    setTimeout(() => {
      if (mapViewRef.current) {
        mapViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Add snapshot to state and store
  const handleSnapshotCaptured = (newSnap: MapSnapshot) => {
    const updated = saveSnapshot(newSnap);
    setSnapshots(updated);
  };

  // Delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = deleteSnapshot(id);
    setSnapshots(updated);
  };

  // Update snapshot notes
  const handleUpdateSnapshotNotes = (id: string, notes: string) => {
    const all = getAllSnapshots();
    const snap = all.find((s) => s.id === id);
    if (snap) {
      snap.notes = notes;
      const updated = saveSnapshot(snap);
      setSnapshots(updated);
    }
  };

  // Handle CSV Dataset Load & Deploy to Places Grid
  const handleDatasetLoaded = async (newPlaces: PlaceItem[]) => {
    if (!newPlaces || newPlaces.length === 0) return;

    const existingIds = new Set(places.map((p) => p.id));
    const processedNewPlaces = newPlaces.map((np, idx) => {
      let finalId = np.id;
      if (!finalId || existingIds.has(finalId)) {
        finalId = `P_${Date.now().toString(36)}_${idx + 1}`;
      }
      existingIds.add(finalId);
      return {
        ...np,
        id: finalId,
      };
    });

    // Prepend all uploaded CSV places directly into the places grid
    const combinedPlaces = [...processedNewPlaces, ...places];
    updatePlaces(combinedPlaces);

    if (combinedPlaces.length > 0) {
      setSelectedPlaceId(processedNewPlaces[0]?.id || combinedPlaces[0].id);

      // Seed snapshots for newly deployed dataset items
      const newSnaps = await initializeSampleSnapshots(combinedPlaces);
      setSnapshots(newSnaps);
    }
  };

  // Reset to initial sample data
  const handleResetSampleData = async () => {
    updatePlaces(INITIAL_PLACES);
    if (INITIAL_PLACES.length > 0) {
      setSelectedPlaceId(INITIAL_PLACES[0].id);
      localStorage.removeItem('geoguard_map_snapshots_v1');
      const resetSnaps = await initializeSampleSnapshots(INITIAL_PLACES);
      setSnapshots(resetSnaps);
    }
  };

  // Delete place row
  const handleDeletePlace = (id: string) => {
    deletePlaceFromFirestore(id);
    const filtered = places.filter((p) => p.id !== id);
    updatePlaces(filtered);
    if (selectedPlaceId === id && filtered.length > 0) {
      setSelectedPlaceId(filtered[0].id);
    }
  };

  // Bulk delete multiple places
  const handleDeleteMultiplePlaces = (ids: string[]) => {
    const idSet = new Set(ids);
    ids.forEach((id) => deletePlaceFromFirestore(id));
    const filtered = places.filter((p) => !idSet.has(p.id));
    updatePlaces(filtered);
    if (selectedPlaceId && idSet.has(selectedPlaceId)) {
      setSelectedPlaceId(filtered[0]?.id || null);
    }
  };

  // Add single place
  const handleAddSinglePlace = (newPlace: PlaceItem) => {
    // Duplicate check guard
    const cleanNewName = newPlace.place_name.trim().toLowerCase();
    const isDupName = places.some((p) => p.place_name.trim().toLowerCase() === cleanNewName);
    const isDupCoords = places.some(
      (p) => Math.abs(p.latitude - newPlace.latitude) < 0.0001 && Math.abs(p.longitude - newPlace.longitude) < 0.0001
    );

    if (isDupName || isDupCoords) {
      console.warn('Duplicate location rejected:', newPlace.place_name);
      return;
    }

    const updated = [newPlace, ...places];
    updatePlaces(updated);
    setSelectedPlaceId(newPlace.id);
  };

  // Accident & Alarm Handlers
  const handleAddAccidentEvent = (event: AccidentEvent) => {
    setAccidentEvents((prev) => {
      const existingIdx = prev.findIndex((e) => e.id === event.id);
      let updated: AccidentEvent[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = event;
      } else {
        updated = [event, ...prev];
      }
      try {
        localStorage.setItem(ACCIDENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    saveAccidentEventToFirestore(event);
  };

  const handleDeleteAccidentEvent = (id: string) => {
    setAccidentEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(ACCIDENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    deleteAccidentEventFromFirestore(id);
  };

  const handleAddAlarm = (alarm: IncidentAlarm) => {
    setAlarms((prev) => {
      const updated = [alarm, ...prev];
      try {
        localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    saveIncidentAlarmToFirestore(alarm);
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    deleteIncidentAlarmFromFirestore(id);
  };

  const handleToggleAlarmMute = (id: string) => {
    setAlarms((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id) {
          const item = { ...a, isMuted: !a.isMuted };
          saveIncidentAlarmToFirestore(item);
          return item;
        }
        return a;
      });
      try {
        localStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const activeIncidentsCount = useMemo(() => {
    return accidentEvents.filter((e) => e.status === 'Alarm Active' || e.severity === 'Critical' || e.severity === 'High').length;
  }, [accidentEvents]);

  // Update single place in state & store
  const handleUpdatePlace = (updatedPlace: PlaceItem) => {
    const updated = places.map((p) => (p.id === updatedPlace.id ? updatedPlace : p));
    updatePlaces(updated);
  };

  // Export current places dataset to CSV
  const handleExportCsv = () => {
    const headers = ['id', 'place_name', 'area', 'street', 'city', 'country', 'latitude', 'longitude', 'description', 'category'];
    const rows = places.map((p) =>
      [
        `"${p.id}"`,
        `"${p.place_name.replace(/"/g, '""')}"`,
        `"${p.area.replace(/"/g, '""')}"`,
        `"${p.street.replace(/"/g, '""')}"`,
        `"${p.city.replace(/"/g, '""')}"`,
        `"${p.country.replace(/"/g, '""')}"`,
        p.latitude,
        p.longitude,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${(p.category || 'Custom Location').replace(/"/g, '""')}"`,
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `geoguard_places_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Header
        placesCount={places.length}
        totalSnapshotsCount={snapshots.length}
        hasGoogleMapsKey={hasGoogleMapsKey}
        hasGeminiKey={hasGeminiKey}
        activeAlarmsCount={alarms.length}
        activeIncidentsCount={activeIncidentsCount}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onLoadSampleData={handleResetSampleData}
        onDownloadCsv={handleExportCsv}
        onOpenApiKeyHelp={() => setIsApiKeyHelpModalOpen(true)}
        onOpenAccidentScanner={() => setIsAccidentScannerOpen(true)}
      />


      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Sidebar / Quick-Access Bar: Recent Locations (Last 5 Visited) */}
        <section>
          <RecentLocationsSidebar
            places={places}
            recentIds={recentPlaceIds}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handleSelectPlace}
            onClearRecent={handleClearRecent}
            snapshotsMap={snapshotsCountMap}
          />
        </section>

        {/* Analytics Dashboard Section */}
        <section>
          <Dashboard
            places={places}
            snapshots={snapshots}
            snapshotsCountMap={snapshotsCountMap}
            onSelectPlace={handleSelectPlace}
            onSelectCategoryFilter={handleSelectCategoryFilter}
          />
        </section>

        {/* Section 1: Places Dataset Grid */}
        <section ref={placeGridRef} className="scroll-mt-20">
          <PlaceGrid
            places={places}
            selectedPlaceId={selectedPlaceId}
            snapshotsMap={snapshotsCountMap}
            onSelectPlace={handleSelectPlace}
            onAddPlace={() => setIsAddPlaceModalOpen(true)}
            onDeletePlace={handleDeletePlace}
            onDeletePlaces={handleDeleteMultiplePlaces}
            onUpdatePlace={handleUpdatePlace}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            externalCategoryFilter={categoryFilter}
          />
        </section>

        {/* Section 2: Selected Place Map Inspector */}
        {selectedPlace ? (
          <section ref={mapViewRef} className="scroll-mt-20">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <MapPin className="w-4 h-4 animate-bounce" />
                <span>Selected Focus Location: {selectedPlace.place_name}</span>
              </div>
              <span className="text-slate-500 font-medium">
                Click <strong>&quot;TAKE SNAPSHOT&quot;</strong> to record today&apos;s map view
              </span>
            </div>

            <GoogleMapView
              selectedPlace={selectedPlace}
              hasGoogleMapsKey={hasGoogleMapsKey}
              onSnapshotCaptured={handleSnapshotCaptured}
              onOpenApiKeyHelp={() => setIsApiKeyHelpModalOpen(true)}
            />

            {/* Section 3: Snapshot History & Gemini AI Difference Analysis */}
            <SnapshotManager
              selectedPlace={selectedPlace}
              snapshots={selectedPlaceSnapshots}
              onDeleteSnapshot={handleDeleteSnapshot}
              onUpdateSnapshotNotes={handleUpdateSnapshotNotes}
            />
          </section>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-800">No places in dataset.</p>
            <p className="text-xs text-slate-500 mt-1">Upload a CSV dataset or click &quot;Sample Data&quot; to begin.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <CsvUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
        existingPlaces={places}
      />

      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onAddPlace={handleAddSinglePlace}
        existingPlaces={places}
      />

      <ApiKeyHelpModal
        isOpen={isApiKeyHelpModalOpen}
        onClose={() => setIsApiKeyHelpModalOpen(false)}
        hasGoogleMapsKey={hasGoogleMapsKey}
        hasGeminiKey={hasGeminiKey}
      />

      <AccidentScannerModal
        isOpen={isAccidentScannerOpen}
        onClose={() => setIsAccidentScannerOpen(false)}
        places={places}
        accidentEvents={accidentEvents}
        alarms={alarms}
        onAddAccidentEvent={handleAddAccidentEvent}
        onDeleteAccidentEvent={handleDeleteAccidentEvent}
        onAddAlarm={handleAddAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onToggleAlarmMute={handleToggleAlarmMute}
        selectedPlace={selectedPlace}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">TerraObserve &copy; {new Date().getFullYear()} - High-Density Geospatial Area Control</span>
          <span className="text-[11px] text-slate-400 font-mono">
            Google Maps SDK &amp; Gemini Vision API Integrated
          </span>
        </div>
      </footer>
    </div>
  );
}
