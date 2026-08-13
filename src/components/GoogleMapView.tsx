import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlaceItem, MapSnapshot, HeatmapOverlayResult, HeatmapPoint } from '../types';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  Layers,
  MapPin,
  Sparkles,
  Key,
  Globe,
  Map as MapIcon,
  Mountain,
  Info,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  AlertTriangle,
  Trees,
  Building2,
  X,
  Target,
  Keyboard,
  Clock,
  Timer,
  Play,
  Pause,
  Database,
  RefreshCw,
  Zap,
  Maximize2,
  Minimize2,
  Download,
  Square,
  Crosshair,
  Focus,
  Flame,
  Activity,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { generateSyntheticMapSnapshot, captureGoogleMapSnapshot } from '../utils/mapImageCanvas';
import html2canvas from 'html2canvas';

interface GoogleMapViewProps {
  selectedPlace: PlaceItem;
  snapshots?: MapSnapshot[];
  hasGoogleMapsKey: boolean;
  onSnapshotCaptured: (snapshot: MapSnapshot) => void;
  onOpenApiKeyHelp: () => void;
}

// Helper to calculate approximate inspection radius for map zoom levels
export const getInspectionRadius = (zoomLevel: number): string => {
  if (zoomLevel >= 21) return '~10m (Micro Detail)';
  if (zoomLevel >= 19) return '~30m (Site / Property)';
  if (zoomLevel >= 18) return '~50m (Building Plot)';
  if (zoomLevel >= 17) return '~100m (Street Block)';
  if (zoomLevel >= 16) return '~200m (Neighborhood)';
  if (zoomLevel >= 15) return '~400m (Corridor Zone)';
  if (zoomLevel >= 14) return '~800m (District Sector)';
  if (zoomLevel >= 13) return '~1.5km (Subregional)';
  if (zoomLevel >= 12) return '~3km (Township)';
  if (zoomLevel >= 10) return '~12km (Metropolitan)';
  if (zoomLevel >= 8) return '~50km (County Area)';
  if (zoomLevel >= 5) return '~300km (State / Region)';
  return '> 1,000km (Continental)';
};

// Helper to format city and country cleanly without duplication
export const formatCityCountry = (city?: string, country?: string): string => {
  const c = (city || '').trim();
  const cnt = (country || '').trim();
  if (!c && !cnt) return 'Unknown Location';
  if (!c) return cnt;
  if (!cnt) return c;
  if (c.toLowerCase().includes(cnt.toLowerCase())) return c;
  return `${c}, ${cnt}`;
};

// Returns inspection radius in exact meters for perimeter box calculation
export const getInspectionRadiusMeters = (zoomLevel: number): number => {
  if (zoomLevel >= 21) return 10;
  if (zoomLevel >= 20) return 20;
  if (zoomLevel >= 19) return 30;
  if (zoomLevel >= 18) return 50;
  if (zoomLevel >= 17) return 100;
  if (zoomLevel >= 16) return 200;
  if (zoomLevel >= 15) return 400;
  if (zoomLevel >= 14) return 800;
  if (zoomLevel >= 13) return 1500;
  if (zoomLevel >= 12) return 3000;
  if (zoomLevel >= 11) return 6000;
  if (zoomLevel >= 10) return 12000;
  if (zoomLevel >= 8) return 50000;
  if (zoomLevel >= 5) return 300000;
  return 1000000;
};

// Calculates geographic LatLng bounds for perimeter box around center
export const getInspectionBounds = (center: { lat: number; lng: number }, radiusMeters: number) => {
  const latDelta = radiusMeters / 111000;
  const latRad = (center.lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const lngDelta = radiusMeters / (111000 * (Math.abs(cosLat) < 0.00001 ? 0.00001 : Math.abs(cosLat)));

  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  };
};

// React component to render a Google Maps Rectangle overlay on live map canvas
const InspectionPerimeterRectangle: React.FC<{
  bounds: { north: number; south: number; east: number; west: number };
  colorTheme: 'blue' | 'emerald' | 'amber' | 'crimson';
}> = ({ bounds, colorTheme }) => {
  const map = useMap();
  const rectangleRef = useRef<any>(null);

  const colorConfig = useMemo(() => {
    switch (colorTheme) {
      case 'emerald':
        return { stroke: '#059669', fill: '#10b981', fillOpacity: 0.03 };
      case 'amber':
        return { stroke: '#d97706', fill: '#f59e0b', fillOpacity: 0.03 };
      case 'crimson':
        return { stroke: '#dc2626', fill: '#ef4444', fillOpacity: 0.03 };
      case 'blue':
      default:
        return { stroke: '#2563eb', fill: '#3b82f6', fillOpacity: 0.03 };
    }
  }, [colorTheme]);

  useEffect(() => {
    if (!map || !(window as any).google?.maps) return;

    if (!rectangleRef.current) {
      rectangleRef.current = new (window as any).google.maps.Rectangle({
        map,
        bounds,
        strokeColor: colorConfig.stroke,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: colorConfig.fill,
        fillOpacity: colorConfig.fillOpacity,
        clickable: false,
      });
    } else {
      rectangleRef.current.setMap(map);
      rectangleRef.current.setBounds(bounds);
      rectangleRef.current.setOptions({
        strokeColor: colorConfig.stroke,
        fillColor: colorConfig.fill,
        fillOpacity: colorConfig.fillOpacity,
      });
    }

    return () => {
      if (rectangleRef.current) {
        rectangleRef.current.setMap(null);
        rectangleRef.current = null;
      }
    };
  }, [map, bounds, colorConfig]);

  return null;
};

// Inner helper component to trigger map panTo and setZoom when recenter button is clicked
const MapRecenterController: React.FC<{
  center: { lat: number; lng: number };
  targetZoom: number;
  triggerCount: number;
}> = ({ center, targetZoom, triggerCount }) => {
  const map = useMap();

  useEffect(() => {
    if (map && triggerCount > 0) {
      map.panTo(center);
      map.setZoom(targetZoom);
    }
  }, [map, triggerCount, center, targetZoom]);

  return null;
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  selectedPlace,
  snapshots = [],
  hasGoogleMapsKey,
  onSnapshotCaptured,
  onOpenApiKeyHelp,
}) => {
  const [zoom, setZoom] = useState<number>(16);
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap' | 'terrain'>('satellite');
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(true);
  const [showPlaceDescription, setShowPlaceDescription] = useState<boolean>(true);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [simulatedEventType, setSimulatedEventType] = useState<'Baseline' | 'Construction' | 'Accident' | 'Deforestation' | 'Flood'>('Construction');
  const [showCaptureModal, setShowCaptureModal] = useState<boolean>(false);
  const [captureNotes, setCaptureNotes] = useState<string>('');
  const [captureDate, setCaptureDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Snapshots for selected place
  const placeSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    return snapshots.filter((s) => s.placeId === selectedPlace.id);
  }, [snapshots, selectedPlace.id]);

  // Gemini Heatmap Overlay State
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState<boolean>(false);
  const [heatmapSnapshotAId, setHeatmapSnapshotAId] = useState<string>('');
  const [heatmapSnapshotBId, setHeatmapSnapshotBId] = useState<string>('');
  const [isComputingHeatmap, setIsComputingHeatmap] = useState<boolean>(false);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapOverlayResult | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [heatmapIntensityMultiplier, setHeatmapIntensityMultiplier] = useState<number>(1.0);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.85);
  const [heatmapColorPalette, setHeatmapColorPalette] = useState<'thermal' | 'cyber' | 'crimson' | 'spectral'>('thermal');
  const [selectedHotspot, setSelectedHotspot] = useState<HeatmapPoint | null>(null);

  // Synchronize snapshot selection defaults when placeSnapshots change
  useEffect(() => {
    if (placeSnapshots.length >= 2) {
      setHeatmapSnapshotAId(placeSnapshots[0].id);
      setHeatmapSnapshotBId(placeSnapshots[placeSnapshots.length - 1].id);
    } else if (placeSnapshots.length === 1) {
      setHeatmapSnapshotAId(placeSnapshots[0].id);
      setHeatmapSnapshotBId(placeSnapshots[0].id);
    } else {
      setHeatmapSnapshotAId('');
      setHeatmapSnapshotBId('');
    }
    setHeatmapResult(null);
    setHeatmapError(null);
  }, [selectedPlace.id, placeSnapshots.length]);

  // Handle computing Gemini Heatmap Overlay
  const handleComputeHeatmap = async (snapAIdOverride?: string, snapBIdOverride?: string) => {
    const snapAId = snapAIdOverride || heatmapSnapshotAId;
    const snapBId = snapBIdOverride || heatmapSnapshotBId;

    let snapA = placeSnapshots.find((s) => s.id === snapAId);
    let snapB = placeSnapshots.find((s) => s.id === snapBId);

    // Fallback image generation if snapshot objects not directly present
    if (!snapA) {
      const defaultUrl = generateSyntheticMapSnapshot({
        placeName: selectedPlace.place_name,
        eventType: 'Baseline',
        dateText: 'Baseline Snapshot',
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
        zoom,
        mapType,
      });
      snapA = {
        id: `synth-a-${selectedPlace.id}`,
        placeId: selectedPlace.id,
        capturedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        dateLabel: 'Baseline State',
        isoDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        imageUrl: defaultUrl,
        zoomLevel: zoom,
        mapType,
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
      };
    }

    if (!snapB) {
      const currentUrl = generateSyntheticMapSnapshot({
        placeName: selectedPlace.place_name,
        eventType: 'Construction',
        dateText: 'Current Status',
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
        zoom,
        mapType,
      });
      snapB = {
        id: `synth-b-${selectedPlace.id}`,
        placeId: selectedPlace.id,
        capturedAt: new Date().toISOString(),
        dateLabel: 'Current Inspection View',
        isoDate: new Date().toISOString().split('T')[0],
        imageUrl: currentUrl,
        zoomLevel: zoom,
        mapType,
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
      };
    }

    setIsComputingHeatmap(true);
    setHeatmapError(null);

    try {
      const res = await fetch('/api/gemini/generate-heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: selectedPlace.id,
          placeName: selectedPlace.place_name,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          zoomLevel: zoom,
          dateA: snapA.dateLabel || snapA.isoDate,
          dateB: snapB.dateLabel || snapB.isoDate,
          snapshotAId: snapA.id,
          snapshotBId: snapB.id,
          imageA: snapA.imageUrl,
          imageB: snapB.imageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compute Gemini Heatmap Overlay');
      }

      setHeatmapResult(data);
    } catch (err: any) {
      console.error('Error computing Gemini heatmap overlay:', err);
      setHeatmapError(err.message || 'Error executing Gemini Heatmap analysis.');
    } finally {
      setIsComputingHeatmap(false);
    }
  };

  // Automated Snapshot Capture Configuration State
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(false);
  const [autoCaptureIntervalSec, setAutoCaptureIntervalSec] = useState<number>(30); // Default 30s interval
  const [autoCaptureEventType, setAutoCaptureEventType] = useState<'Baseline' | 'Construction' | 'Accident' | 'Deforestation' | 'Flood' | 'Random'>('Construction');
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number>(30);
  const [autoCaptureCount, setAutoCaptureCount] = useState<number>(0);
  const [lastAutoCapturedTime, setLastAutoCapturedTime] = useState<string | null>(null);
  const [showAutoCaptureConfigModal, setShowAutoCaptureConfigModal] = useState<boolean>(false);
  const [autoCaptureToast, setAutoCaptureToast] = useState<{
    id: string;
    placeName: string;
    timeStr: string;
    eventType: string;
  } | null>(null);

  // Visual Inspection Perimeter Rectangle State
  const [showPerimeterRectangle, setShowPerimeterRectangle] = useState<boolean>(true);
  const [perimeterColorTheme, setPerimeterColorTheme] = useState<'blue' | 'emerald' | 'amber' | 'crimson'>('blue');
  const [showPerimeterCornerTags, setShowPerimeterCornerTags] = useState<boolean>(true);

  // Current map center state (supports panning via keyboard or controls)
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: selectedPlace.latitude,
    lng: selectedPlace.longitude,
  });

  // Computed Inspection Perimeter Radius in Meters & Geographic Bounds
  const radiusMeters = useMemo(() => getInspectionRadiusMeters(zoom), [zoom]);
  const perimeterBounds = useMemo(() => getInspectionBounds(currentCenter, radiusMeters), [currentCenter, radiusMeters]);

  const [mapsError, setMapsError] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentCenter({ lat: selectedPlace.latitude, lng: selectedPlace.longitude });
    setShowPlaceDescription(true);
    setInfoWindowOpen(true);
  }, [selectedPlace.id, selectedPlace.latitude, selectedPlace.longitude]);

  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Google Maps authentication failed, switching to static canvas fallback.');
      setMapsError(true);
    };
    (window as any).gm_authFailure = handleAuthFailure;
    return () => {
      if ((window as any).gm_authFailure === handleAuthFailure) {
        delete (window as any).gm_authFailure;
      }
    };
  }, []);

  // Listen for Escape key to exit Fullscreen inspection mode
  useEffect(() => {
    const handleKeyDownEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDownEsc);
    return () => window.removeEventListener('keydown', handleKeyDownEsc);
  }, [isFullscreen]);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '' && !mapsError;

  // Base place center coordinates
  const baseCenter = { lat: selectedPlace.latitude, lng: selectedPlace.longitude };

  const [isRecentering, setIsRecentering] = useState<boolean>(false);

  // Smoothly recenter map to selected place coordinates
  const handleRecenter = () => {
    setZoom(16);
    setCurrentCenter({ lat: selectedPlace.latitude, lng: selectedPlace.longitude });
    setRecenterTrigger((prev) => prev + 1);
    setShowPlaceDescription(true);
    setInfoWindowOpen(true);
    setIsRecentering(true);

    setTimeout(() => {
      setIsRecentering(false);
    }, 400);
  };

  // Keyboard navigation shortcuts for panning and controlling the map viewport
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ignore key presses if user is typing in form input, textarea, or select dropdowns
    const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return;
    }

    // Proportional panning step based on current zoom level
    const panStep = 0.05 / Math.pow(2, zoom - 10);

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        setCurrentCenter((prev) => ({ ...prev, lat: prev.lat + panStep }));
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        setCurrentCenter((prev) => ({ ...prev, lat: prev.lat - panStep }));
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        setCurrentCenter((prev) => ({ ...prev, lng: prev.lng - panStep }));
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        setCurrentCenter((prev) => ({ ...prev, lng: prev.lng + panStep }));
        break;
      case '+':
      case '=':
        e.preventDefault();
        setZoom((z) => Math.min(21, z + 1));
        break;
      case '-':
      case '_':
        e.preventDefault();
        setZoom((z) => Math.max(2, z - 1));
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        handleRecenter();
        break;
      default:
        break;
    }
  };

  // Automated Map Snapshot Capture execution function
  const executeAutoCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let activeOverlay = autoCaptureEventType;
      if (activeOverlay === 'Random') {
        const overlays: ('Baseline' | 'Construction' | 'Accident' | 'Deforestation' | 'Flood')[] = [
          'Baseline',
          'Construction',
          'Accident',
          'Deforestation',
          'Flood',
        ];
        activeOverlay = overlays[Math.floor(Math.random() * overlays.length)];
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateISO = now.toISOString().split('T')[0];
      const formattedDateLabel = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const imageDataUrl = await captureGoogleMapSnapshot({
        mapContainer: mapContainerRef.current,
        apiKey: API_KEY,
        placeName: selectedPlace.place_name,
        lat: currentCenter.lat,
        lng: currentCenter.lng,
        zoom: zoom,
        mapType: mapType,
        eventType: activeOverlay as any,
        dateText: `Auto-Captured ${timeStr} (${activeOverlay})`,
        perimeterOptions: {
          show: showPerimeterRectangle,
          radiusMeters: radiusMeters,
          colorTheme: perimeterColorTheme,
          bounds: perimeterBounds,
          showCornerTags: showPerimeterCornerTags,
        },
      });

      const newSnap: MapSnapshot = {
        id: `snap-auto-${selectedPlace.id}-${Date.now()}`,
        placeId: selectedPlace.id,
        capturedAt: now.toISOString(),
        dateLabel: `Auto-Capture ${timeStr} (${activeOverlay})`,
        isoDate: dateISO,
        imageUrl: imageDataUrl,
        zoomLevel: zoom,
        mapType: mapType,
        notes: `Automated interval geospatial snapshot captured at ${timeStr} for "${selectedPlace.place_name}". Auto-stored & synced in Firestore database.`,
        lat: currentCenter.lat,
        lng: currentCenter.lng,
        eventOverlay: activeOverlay as any,
      };

      // Save locally & sync to Firestore database
      onSnapshotCaptured(newSnap);

      setAutoCaptureCount((prev) => prev + 1);
      setLastAutoCapturedTime(timeStr);
      setAutoCaptureToast({
        id: newSnap.id,
        placeName: selectedPlace.place_name,
        timeStr: timeStr,
        eventType: activeOverlay,
      });

      // Clear toast alert after 6 seconds
      setTimeout(() => {
        setAutoCaptureToast(null);
      }, 6000);
    } catch (err) {
      console.error('Failed to auto-capture map snapshot', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Automated Interval Timer Effect
  useEffect(() => {
    if (!autoCaptureEnabled) {
      setAutoCaptureCountdown(autoCaptureIntervalSec);
      return;
    }

    // Reset countdown when interval or place changes
    setAutoCaptureCountdown(autoCaptureIntervalSec);

    const intervalTimer = setInterval(() => {
      setAutoCaptureCountdown((prev) => {
        if (prev <= 1) {
          executeAutoCapture();
          return autoCaptureIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [
    autoCaptureEnabled,
    autoCaptureIntervalSec,
    selectedPlace.id,
    currentCenter.lat,
    currentCenter.lng,
    zoom,
    mapType,
    autoCaptureEventType,
  ]);

  // Handle taking a manual map snapshot (with optional simultaneous download)
  const handleConfirmSnapshot = async (andDownload = false) => {
    setIsCapturing(true);

    try {
      const imageDataUrl = await captureGoogleMapSnapshot({
        mapContainer: mapContainerRef.current,
        apiKey: API_KEY,
        placeName: selectedPlace.place_name,
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
        zoom: zoom,
        mapType: mapType,
        eventType: simulatedEventType,
        dateText: `${captureDate} - ${simulatedEventType}`,
        perimeterOptions: {
          show: showPerimeterRectangle,
          radiusMeters: radiusMeters,
          colorTheme: perimeterColorTheme,
          bounds: perimeterBounds,
          showCornerTags: showPerimeterCornerTags,
        },
      });

      const formattedDateLabel = new Date(captureDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const newSnap: MapSnapshot = {
        id: `snap-${selectedPlace.id}-${Date.now()}`,
        placeId: selectedPlace.id,
        capturedAt: new Date().toISOString(),
        dateLabel: `${formattedDateLabel} (${simulatedEventType})`,
        isoDate: captureDate,
        imageUrl: imageDataUrl,
        zoomLevel: zoom,
        mapType: mapType,
        notes: captureNotes || `Satellite inspection captured on ${captureDate}. Mode: ${simulatedEventType}.`,
        lat: selectedPlace.latitude,
        lng: selectedPlace.longitude,
        eventOverlay: simulatedEventType,
      };

      onSnapshotCaptured(newSnap);

      if (andDownload) {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        const cleanName = selectedPlace.place_name.replace(/\s+/g, '_');
        link.download = `GeoGuard_Snapshot_${cleanName}_${captureDate}_${simulatedEventType}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowCaptureModal(false);
      setCaptureNotes('');
    } catch (err) {
      console.error('Error capturing map snapshot', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 text-slate-100 w-screen h-screen flex flex-col overflow-hidden m-0 rounded-none' : 'bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6'}>
      {/* View Header & Map Type Toggle Bar */}
      <div className={`p-3.5 border-b flex flex-col gap-3 transition-colors ${isFullscreen ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold flex-shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>{selectedPlace.place_name}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${isFullscreen ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {selectedPlace.area}
                </span>
                {isFullscreen && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>FULLSCREEN ACTIVE</span>
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-medium ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatCityCountry(selectedPlace.city, selectedPlace.country)} ({selectedPlace.latitude.toFixed(4)}° N, {selectedPlace.longitude.toFixed(4)}° E)
              </p>
            </div>
          </div>

          {/* Quick Actions & Snapshot Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const next = !showPlaceDescription;
                setShowPlaceDescription(next);
                setInfoWindowOpen(next);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded border transition-all ${
                showPlaceDescription
                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-sm'
              }`}
              title={showPlaceDescription ? 'Close Description Overlay' : 'Show Description Overlay'}
            >
              <Info className="w-4 h-4 text-blue-600" />
              <span>{showPlaceDescription ? 'Hide Description' : 'Show Description'}</span>
            </button>

            <button
              onClick={() => setMapType(mapType === 'satellite' ? 'roadmap' : 'satellite')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded border border-slate-300 shadow-sm transition-all"
              title="Quick Toggle Roadmap / Satellite"
            >
              {mapType === 'satellite' ? <MapIcon className="w-4 h-4 text-blue-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
              <span>Switch to {mapType === 'satellite' ? 'Roadmap' : 'Satellite'}</span>
            </button>

            {/* Automated Interval Capture Control Button */}
            <button
              onClick={() => setShowAutoCaptureConfigModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded border transition-all ${
                autoCaptureEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs hover:bg-emerald-100 ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-sm'
              }`}
              title="Configure Automated Interval Snapshot Capture & Firestore Persistence"
            >
              <Timer className={`w-4 h-4 ${autoCaptureEnabled ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>
                {autoCaptureEnabled ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Auto ({autoCaptureCountdown}s)</span>
                  </span>
                ) : (
                  'Auto-Capture'
                )}
              </span>
            </button>

            {/* Fullscreen Viewport Toggle Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded border transition-all ${
                isFullscreen
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm'
              }`}
              title={isFullscreen ? 'Exit Fullscreen Viewport (Press ESC)' : 'Expand Map to Fullscreen Viewport'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-slate-950" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-blue-600" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                const nextState = !showHeatmapOverlay;
                setShowHeatmapOverlay(nextState);
                if (nextState && !heatmapResult) {
                  handleComputeHeatmap();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded shadow transition-all ${
                showHeatmapOverlay
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white ring-2 ring-red-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
              }`}
              title="Toggle Gemini AI Change Detection Heatmap Overlay directly on map"
            >
              <Flame className={`w-4 h-4 ${showHeatmapOverlay ? 'text-yellow-200 animate-pulse' : 'text-amber-400'}`} />
              <span>Heatmap Overlay</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold ${showHeatmapOverlay ? 'bg-black/30 text-yellow-100' : 'bg-slate-800 text-slate-300'}`}>
                {showHeatmapOverlay ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => setShowCaptureModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>TAKE SNAPSHOT</span>
            </button>
          </div>
        </div>

        {/* Dedicated Gemini Heatmap Overlay Control Panel */}
        {showHeatmapOverlay && (
          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg border border-red-500/40 shadow-xl flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-md">
                  <Flame className="w-4 h-4 text-yellow-200 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">Gemini Heatmap Overlay</h4>
                    <span className="px-2 py-0.2 text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      <span>SPATIAL AI DETECTOR</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Highlights physical changes between snapshot pairs directly on map coordinates.
                  </p>
                </div>
              </div>

              {/* Snapshot Pair Selection & Compute Action */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded border border-slate-700 text-xs font-medium">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Snap A:</span>
                  <select
                    value={heatmapSnapshotAId}
                    onChange={(e) => {
                      setHeatmapSnapshotAId(e.target.value);
                      handleComputeHeatmap(e.target.value, heatmapSnapshotBId);
                    }}
                    className="bg-slate-900 text-white text-[11px] font-semibold border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400"
                  >
                    {placeSnapshots.length === 0 ? (
                      <option value="">Baseline (Auto)</option>
                    ) : (
                      placeSnapshots.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          Snap #{idx + 1}: {s.dateLabel}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <span className="text-slate-500 font-bold text-xs">vs</span>

                <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded border border-slate-700 text-xs font-medium">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Snap B:</span>
                  <select
                    value={heatmapSnapshotBId}
                    onChange={(e) => {
                      setHeatmapSnapshotBId(e.target.value);
                      handleComputeHeatmap(heatmapSnapshotAId, e.target.value);
                    }}
                    className="bg-slate-900 text-white text-[11px] font-semibold border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400"
                  >
                    {placeSnapshots.length === 0 ? (
                      <option value="">Current View (Auto)</option>
                    ) : (
                      placeSnapshots.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          Snap #{idx + 1}: {s.dateLabel}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  onClick={() => handleComputeHeatmap()}
                  disabled={isComputingHeatmap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded shadow transition-all cursor-pointer"
                >
                  {isComputingHeatmap ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <Sparkles className="w-3.5 h-3.5 text-slate-950" />}
                  <span>{isComputingHeatmap ? 'Computing...' : 'Compute Heatmap'}</span>
                </button>
              </div>
            </div>

            {/* Heatmap Customization & Visualization Parameters */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Palette Selector */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Palette:</span>
                {[
                  { id: 'thermal', label: 'Thermal Fire', color: 'from-yellow-400 via-red-500 to-purple-800' },
                  { id: 'cyber', label: 'Cyber Neon', color: 'from-cyan-400 via-emerald-500 to-fuchsia-600' },
                  { id: 'crimson', label: 'Hazard Red', color: 'from-amber-400 via-red-600 to-red-950' },
                  { id: 'spectral', label: 'Spectral', color: 'from-lime-400 via-orange-500 to-rose-700' },
                ].map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setHeatmapColorPalette(pal.id as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                      heatmapColorPalette === pal.id
                        ? 'bg-slate-700 text-white border border-amber-400/80 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${pal.color}`} />
                    <span>{pal.label}</span>
                  </button>
                ))}
              </div>

              {/* Radius Intensity Multiplier */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Glow Radius:</span>
                {[0.7, 1.0, 1.5, 2.0].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setHeatmapIntensityMultiplier(mult)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                      heatmapIntensityMultiplier === mult
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Opacity:</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                  className="w-20 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[10px] font-mono font-bold text-amber-300">{Math.round(heatmapOpacity * 100)}%</span>
              </div>
            </div>

            {/* Heatmap Findings Summary Badge */}
            {heatmapResult && (
              <div className="bg-slate-950/80 p-2.5 rounded-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{heatmapResult.points.length} Spatial Hotspots Detected</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-400 font-mono">Max Intensity: {Math.round(heatmapResult.maxIntensity * 100)}%</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-tight">
                      {heatmapResult.overallSummary}
                    </p>
                  </div>
                </div>

                {selectedHotspot && (
                  <button
                    onClick={() => setSelectedHotspot(null)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold rounded border border-slate-700 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>Clear Hotspot Focus</span>
                  </button>
                )}
              </div>
            )}

            {heatmapError && (
              <div className="bg-red-950/80 text-red-200 p-2 rounded-md border border-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{heatmapError}</span>
              </div>
            )}
          </div>
        )}

        {/* View Style Control Selector & Change Detection Guidance */}
        <div className={`border rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-extrabold flex items-center gap-1 mr-1 ${isFullscreen ? 'text-slate-200' : 'text-slate-700'}`}>
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Map View Style:</span>
            </span>

            {/* Satellite Mode Button */}
            <button
              onClick={() => setMapType('satellite')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mapType === 'satellite'
                  ? 'bg-slate-900 text-white shadow ring-2 ring-blue-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Satellite</span>
            </button>

            {/* Roadmap Mode Button */}
            <button
              onClick={() => setMapType('roadmap')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mapType === 'roadmap'
                  ? 'bg-blue-600 text-white shadow ring-2 ring-blue-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-300" />
              <span>Roadmap</span>
            </button>

            {/* Hybrid Mode Button */}
            <button
              onClick={() => setMapType('hybrid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mapType === 'hybrid'
                  ? 'bg-purple-700 text-white shadow ring-2 ring-purple-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-300" />
              <span>Hybrid</span>
            </button>

            {/* Terrain Mode Button */}
            <button
              onClick={() => setMapType('terrain')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mapType === 'terrain'
                  ? 'bg-amber-700 text-white shadow ring-2 ring-amber-500/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Mountain className="w-3.5 h-3.5 text-amber-200" />
              <span>Terrain</span>
            </button>
          </div>

          {/* Dynamic Contextual Helper Banner for Physical Change Inspection */}
          <div className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-2 border bg-slate-50 border-slate-200 text-slate-700">
            {mapType === 'satellite' && (
              <>
                <Trees className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Satellite Mode:</strong> High-res orbital imagery for detecting tree cutting, land clearing &amp; excavation.
                </span>
              </>
            )}
            {mapType === 'roadmap' && (
              <>
                <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Roadmap Mode:</strong> Vector street grid &amp; building outlines for property boundaries &amp; logistics.
                </span>
              </>
            )}
            {mapType === 'hybrid' && (
              <>
                <Eye className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span>
                  <strong>Hybrid Mode:</strong> Satellite aerial photos with overlaid street names &amp; landmark labels.
                </span>
              </>
            )}
            {mapType === 'terrain' && (
              <>
                <Mountain className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Terrain Mode:</strong> Topographic contour lines highlighting elevation shifts &amp; watershed slopes.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dedicated Inspection Radius & Precision Zoom Control Slider */}
        <div className={`border rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className={`text-xs font-extrabold uppercase tracking-wider ${isFullscreen ? 'text-slate-200' : 'text-slate-800'}`}>
                Inspection Radius &amp; Zoom:
              </span>
            </div>

            {/* Precision Zoom Slider Control */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setZoom(Math.max(2, zoom - 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 border border-slate-200 transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min={2}
                max={21}
                step={1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-28 sm:w-40 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                title={`Zoom Level: ${zoom}x`}
              />

              <button
                type="button"
                onClick={() => setZoom(Math.min(21, zoom + 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 border border-slate-200 transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Preset Zoom Radius Buttons */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-300/60 pl-3">
              <span className={`text-[10px] font-bold uppercase mr-1 ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>Presets:</span>
              {[
                { label: 'Site (18x)', val: 18 },
                { label: 'Block (16x)', val: 16 },
                { label: 'District (14x)', val: 14 },
                { label: 'Metro (11x)', val: 11 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setZoom(preset.val)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                    zoom === preset.val
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isFullscreen
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Radius Readout Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>{zoom}x Zoom</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold">{getInspectionRadius(zoom)}</span>
            </span>
          </div>
        </div>

        {/* Visual Inspection Perimeter Rectangle Toolbar */}
        <div className={`border rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs transition-colors ${isFullscreen ? 'bg-slate-800/95 border-slate-700 text-slate-100' : 'bg-slate-900 text-white border-slate-800'}`}>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle Perimeter Box Button */}
            <button
              type="button"
              onClick={() => setShowPerimeterRectangle(!showPerimeterRectangle)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs ${
                showPerimeterRectangle
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <Square className="w-4 h-4" />
              <span>Perimeter Boundary Box</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold ${showPerimeterRectangle ? 'bg-blue-900 text-blue-100' : 'bg-slate-700 text-slate-400'}`}>
                {showPerimeterRectangle ? 'ACTIVE' : 'OFF'}
              </span>
            </button>

            {showPerimeterRectangle && (
              <>
                {/* Color Theme Selector */}
                <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-md border border-slate-700">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Theme:</span>
                  {[
                    { id: 'blue', label: 'Tactical Blue', color: 'bg-blue-500' },
                    { id: 'emerald', label: 'Emerald Zone', color: 'bg-emerald-500' },
                    { id: 'amber', label: 'Amber Alert', color: 'bg-amber-500' },
                    { id: 'crimson', label: 'Crimson Hazard', color: 'bg-red-500' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setPerimeterColorTheme(theme.id as any)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        perimeterColorTheme === theme.id
                          ? 'bg-slate-700 text-white shadow-xs border border-slate-500'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${theme.color}`} />
                      <span className="hidden sm:inline">{theme.label}</span>
                    </button>
                  ))}
                </div>

                {/* Corner Coordinates Callout Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPerimeterCornerTags(!showPerimeterCornerTags)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                    showPerimeterCornerTags
                      ? 'bg-slate-800 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700'
                  }`}
                  title="Toggle corner Lat/Lng coordinate markers"
                >
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Corner Callouts</span>
                </button>
              </>
            )}
          </div>

          {/* Live Boundary Metric Readout */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700">
            <Focus className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>Inspection Boundary Span:</span>
            <span className="text-emerald-400 font-extrabold">
              {radiusMeters * 2 >= 1000 ? `${((radiusMeters * 2) / 1000).toFixed(2)}km` : `${radiusMeters * 2}m`} × {radiusMeters * 2 >= 1000 ? `${((radiusMeters * 2) / 1000).toFixed(2)}km` : `${radiusMeters * 2}m`}
            </span>
          </div>
        </div>
      </div>

      {/* API Key Banner Warning if Key Missing */}
      {!hasValidKey && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Google Maps Static Renderer:</strong> Live canvas overlay active. Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> in Settings &gt; Secrets for full JS SDK interactive tiles.
            </span>
          </div>
          <button
            onClick={onOpenApiKeyHelp}
            className="px-2.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold border border-amber-300 rounded text-xs transition-colors whitespace-nowrap ml-2"
          >
            Key Guide
          </button>
        </div>
      )}

      {/* Map Viewport Area */}
      <div
        className={`relative w-full ${isFullscreen ? 'flex-1 h-full min-h-0' : 'h-[420px]'} bg-slate-100 focus:outline-none transition-all ${
          isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        ref={mapContainerRef}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        aria-label="Interactive map canvas. Click to focus, use arrow keys or WASD to pan, + and - to zoom, R to recenter."
      >
        {isFullscreen && (
          <div className="absolute top-3 right-3 z-30 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 text-xs font-bold pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fullscreen Inspection Mode</span>
            <span className="text-slate-400 text-[10px] font-mono border-l border-slate-700 pl-2">
              ESC to Exit
            </span>
          </div>
        )}
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <MapRecenterController center={currentCenter} targetZoom={16} triggerCount={recenterTrigger} />
            <Map
              center={currentCenter}
              zoom={zoom}
              mapTypeId={mapType}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              onCameraChanged={(ev) => {
                setZoom(ev.detail.zoom);
                if (ev.detail.center) {
                  setCurrentCenter(ev.detail.center);
                }
              }}
            >
              {/* Visual Inspection Perimeter Rectangle Overlay */}
              {showPerimeterRectangle && (
                <>
                  <InspectionPerimeterRectangle
                    bounds={perimeterBounds}
                    colorTheme={perimeterColorTheme}
                  />

                  {showPerimeterCornerTags && (
                    <>
                      {/* NW Corner Coordinate Marker Tag */}
                      <AdvancedMarker position={{ lat: perimeterBounds.north, lng: perimeterBounds.west }}>
                        <div className="bg-slate-900/90 text-white backdrop-blur-md px-2 py-0.5 rounded border border-slate-700 text-[10px] font-mono font-bold shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
                          NW: {perimeterBounds.north.toFixed(4)}°, {perimeterBounds.west.toFixed(4)}°
                        </div>
                      </AdvancedMarker>

                      {/* SE Corner Coordinate Marker Tag */}
                      <AdvancedMarker position={{ lat: perimeterBounds.south, lng: perimeterBounds.east }}>
                        <div className="bg-slate-900/90 text-white backdrop-blur-md px-2 py-0.5 rounded border border-slate-700 text-[10px] font-mono font-bold shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap">
                          SE: {perimeterBounds.south.toFixed(4)}°, {perimeterBounds.east.toFixed(4)}°
                        </div>
                      </AdvancedMarker>

                      {/* North Boundary Info Label */}
                      <AdvancedMarker position={{ lat: perimeterBounds.north, lng: currentCenter.lng }}>
                        <div className="bg-blue-950/90 text-blue-100 backdrop-blur-md px-2.5 py-1 rounded-md border border-blue-500/60 text-[10px] font-mono font-bold shadow-xl -translate-x-1/2 -translate-y-full mb-1 pointer-events-none whitespace-nowrap flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span>INSPECTION PERIMETER ({radiusMeters * 2}m × {radiusMeters * 2}m Zone)</span>
                        </div>
                      </AdvancedMarker>
                    </>
                  )}
                </>
              )}

              <AdvancedMarker
                position={baseCenter}
                onClick={() => {
                  setInfoWindowOpen(true);
                  setShowPlaceDescription(true);
                }}
              >
                <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#1d4ed8" />
              </AdvancedMarker>

              {infoWindowOpen && showPlaceDescription && (
                <InfoWindow
                  position={baseCenter}
                  onCloseClick={() => {
                    setInfoWindowOpen(false);
                    setShowPlaceDescription(false);
                  }}
                >
                  <div className="p-1 max-w-xs text-slate-900">
                    <h4 className="font-bold text-xs text-slate-900">{selectedPlace.place_name}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">{formatCityCountry(selectedPlace.city, selectedPlace.country)}</p>
                    <p className="text-[10px] text-slate-500 italic mt-1">{selectedPlace.description}</p>
                  </div>
                </InfoWindow>
              )}

              {/* Gemini Heatmap Overlay Points (Live Map View) */}
              {showHeatmapOverlay && heatmapResult && heatmapResult.points.map((point) => {
                const scaledRadius = Math.max(18, Math.round(point.radiusMeters * heatmapIntensityMultiplier));
                const intensityPct = Math.round(point.intensity * 100);

                let glowGradient = 'from-amber-400/80 via-red-500/60 to-purple-700/0';
                let badgeColor = 'bg-red-600 text-white';
                let dotColor = 'bg-red-500';

                if (heatmapColorPalette === 'cyber') {
                  glowGradient = 'from-cyan-400/80 via-emerald-500/60 to-fuchsia-600/0';
                  badgeColor = 'bg-cyan-600 text-white';
                  dotColor = 'bg-cyan-400';
                } else if (heatmapColorPalette === 'crimson') {
                  glowGradient = 'from-yellow-400/80 via-amber-500/70 to-red-600/0';
                  badgeColor = 'bg-red-700 text-white';
                  dotColor = 'bg-amber-400';
                } else if (heatmapColorPalette === 'spectral') {
                  glowGradient = 'from-lime-400/80 via-orange-500/70 to-rose-700/0';
                  badgeColor = 'bg-orange-600 text-white';
                  dotColor = 'bg-lime-400';
                }

                return (
                  <React.Fragment key={point.id}>
                    <AdvancedMarker
                      position={{ lat: point.lat, lng: point.lng }}
                      onClick={() => setSelectedHotspot(selectedHotspot?.id === point.id ? null : point)}
                    >
                      <div className="relative cursor-pointer group flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                        {/* Radial Heat Circle */}
                        <div
                          style={{
                            width: `${scaledRadius * 2.4}px`,
                            height: `${scaledRadius * 2.4}px`,
                            opacity: heatmapOpacity,
                          }}
                          className={`rounded-full bg-gradient-radial ${glowGradient} animate-pulse pointer-events-none transition-all duration-300 shadow-2xl`}
                        />

                        {/* Ping Ring & Core Dot */}
                        <div className="absolute w-6 h-6 rounded-full border-2 border-white/80 animate-ping opacity-75" />
                        <div className={`absolute w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white shadow-lg group-hover:scale-125 transition-transform`} />

                        {/* Mini Hotspot Badge */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-slate-700 shadow-xl flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${point.severity === 'Critical' ? 'bg-red-500 animate-ping' : point.severity === 'High' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span>{point.changeType} ({intensityPct}%)</span>
                        </div>
                      </div>
                    </AdvancedMarker>

                    {/* Interactive Hotspot Info Window */}
                    {selectedHotspot?.id === point.id && (
                      <InfoWindow
                        position={{ lat: point.lat, lng: point.lng }}
                        onCloseClick={() => setSelectedHotspot(null)}
                      >
                        <div className="p-1.5 max-w-xs text-slate-900 font-sans">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${badgeColor}`}>
                              {point.severity} SEVERITY
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold">
                              Heat: {intensityPct}%
                            </span>
                          </div>
                          <h5 className="font-extrabold text-xs text-slate-900">{point.changeType}</h5>
                          <p className="text-[11px] text-slate-700 mt-1 leading-snug">{point.description}</p>
                          <div className="mt-2 text-[10px] font-mono text-slate-500 bg-slate-100 p-1.5 rounded border border-slate-200">
                            <div>Coords: {point.lat.toFixed(5)}°, {point.lng.toFixed(5)}°</div>
                            <div>Radius: {point.radiusMeters}m ({point.xPercent}% X, {point.yPercent}% Y)</div>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </React.Fragment>
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          /* High Fidelity Canvas Map Fallback when no Google Maps Key */
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-100 overflow-hidden">
            <img
              src={generateSyntheticMapSnapshot({
                placeName: selectedPlace.place_name,
                eventType: 'Baseline',
                dateText: 'Live Map View',
                lat: currentCenter.lat,
                lng: currentCenter.lng,
                zoom: zoom,
                mapType: mapType,
              })}
              alt="Interactive Map View"
              className="w-full h-full object-cover"
            />

            {/* SVG Heatmap Overlay for Static Canvas View */}
            {showHeatmapOverlay && heatmapResult && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                <svg className="w-full h-full">
                  <defs>
                    <radialGradient id="thermalHeatGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.7" />
                      <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="cyberHeatGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.95" />
                      <stop offset="40%" stopColor="#10b981" stopOpacity="0.7" />
                      <stop offset="75%" stopColor="#d946ef" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="crimsonHeatGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                      <stop offset="50%" stopColor="#dc2626" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {heatmapResult.points.map((pt) => {
                    const rad = Math.max(30, Math.round(pt.radiusMeters * 1.5 * heatmapIntensityMultiplier));
                    const gradId =
                      heatmapColorPalette === 'cyber' ? 'url(#cyberHeatGrad)' :
                      heatmapColorPalette === 'crimson' ? 'url(#crimsonHeatGrad)' :
                      'url(#thermalHeatGrad)';

                    return (
                      <g key={pt.id} style={{ opacity: heatmapOpacity }}>
                        <circle
                          cx={`${pt.xPercent}%`}
                          cy={`${pt.yPercent}%`}
                          r={rad}
                          fill={gradId}
                          className="animate-pulse"
                        />
                        <circle
                          cx={`${pt.xPercent}%`}
                          cy={`${pt.yPercent}%`}
                          r={rad * 0.35}
                          fill="#ffffff"
                          fillOpacity="0.6"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Hotspot Interactive Badges for Static Canvas View */}
                {heatmapResult.points.map((pt) => (
                  <div
                    key={`badge-${pt.id}`}
                    style={{ left: `${pt.xPercent}%`, top: `${pt.yPercent}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-30"
                    onClick={() => setSelectedHotspot(selectedHotspot?.id === pt.id ? null : pt)}
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-white bg-red-600 animate-ping absolute" />
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-amber-400 relative flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                    </div>

                    <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-700 shadow-xl flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${pt.severity === 'Critical' ? 'bg-red-500 animate-ping' : 'bg-amber-400'}`} />
                      <span>{pt.changeType}</span>
                      <span className="text-amber-300 font-mono">({Math.round(pt.intensity * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Visual Inspection Perimeter Rectangle Overlay for Static Canvas */}
            {showPerimeterRectangle && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className={`relative w-3/4 h-3/4 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col justify-between p-3 shadow-xl ${
                  perimeterColorTheme === 'emerald' ? 'border-emerald-400 bg-emerald-500/5 shadow-emerald-500/10' :
                  perimeterColorTheme === 'amber' ? 'border-amber-400 bg-amber-500/5 shadow-amber-500/10' :
                  perimeterColorTheme === 'crimson' ? 'border-red-400 bg-red-500/5 shadow-red-500/10' :
                  'border-blue-400 bg-blue-500/5 shadow-blue-500/10'
                }`}>
                  {/* Corner Bracket Graphics (┌ ┐ └ ┘) */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />

                  {/* Center Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-8 h-0.5 bg-white" />
                    <div className="h-8 w-0.5 bg-white absolute" />
                  </div>

                  {/* Top Boundary Label */}
                  <div className="self-center bg-slate-900/90 text-white backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-mono font-bold border border-slate-700 shadow-md">
                    INSPECTION PERIMETER ({radiusMeters * 2}m × {radiusMeters * 2}m Zone)
                  </div>

                  {/* Corner Lat/Lng Callout Badges */}
                  {showPerimeterCornerTags && (
                    <div className="flex justify-between items-end text-[9px] font-mono font-bold text-white">
                      <span className="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                        NW: {perimeterBounds.north.toFixed(4)}°, {perimeterBounds.west.toFixed(4)}°
                      </span>
                      <span className="bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                        SE: {perimeterBounds.south.toFixed(4)}°, {perimeterBounds.east.toFixed(4)}°
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Radar Scanner Animation Overlay when Computing Gemini Heatmap */}
        {isComputingHeatmap && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-40 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-red-500 animate-spin" />
              <Flame className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <h4 className="font-black text-sm text-amber-300 uppercase tracking-wider">Gemini Spatial Heatmap Analysis</h4>
            <p className="text-xs text-slate-300 max-w-sm mt-1">
              Comparing baseline and current satellite snapshots to compute differential spatial change hotspots...
            </p>
          </div>
        )}

        {/* Auto-Capture Active Floating Status Badge */}
        {autoCaptureEnabled && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/40 shadow-xl flex items-center gap-2.5 text-[11px] font-semibold transition-all">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span>Auto-Capture ACTIVE</span>
              <span className="text-slate-400">•</span>
              <span>Next in <strong className="text-emerald-300 font-mono font-bold">{autoCaptureCountdown}s</strong></span>
              <span className="text-slate-400">({autoCaptureIntervalSec}s interval)</span>
            </span>
            <button
              onClick={() => setShowAutoCaptureConfigModal(true)}
              className="ml-1 px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 text-[10px] uppercase tracking-wider font-extrabold rounded border border-emerald-400/30 transition-colors"
            >
              Config
            </button>
          </div>
        )}

        {/* Auto-Capture Firestore Toast Notification */}
        {autoCaptureToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 text-emerald-100 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-500 shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top duration-200">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Auto-Captured &amp; Saved to Firestore!</span>
                <span className="bg-emerald-800/80 text-emerald-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-600/50">
                  {autoCaptureToast.timeStr}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/90 font-medium mt-0.5">
                Target: {autoCaptureToast.placeName} ({autoCaptureToast.eventType}) • Synced to <code>snapshots</code>
              </p>
            </div>
            <button
              onClick={() => setAutoCaptureToast(null)}
              className="text-emerald-400 hover:text-white p-1 rounded hover:bg-emerald-800/50 transition-colors ml-1"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Keyboard Navigation Helper Badge Overlay */}
        <div className="absolute bottom-3 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-md flex items-center gap-2 text-[11px] text-slate-700 pointer-events-none">
          <Keyboard className={`w-3.5 h-3.5 flex-shrink-0 ${isFocused ? 'text-blue-600 animate-pulse' : 'text-slate-500'}`} />
          <span className="font-medium">
            {isFocused ? (
              <span className="text-blue-800 font-bold">
                Map Focused: <span className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-mono text-[10px]">↑↓←→ / WASD</span> Pan • <span className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-mono text-[10px]">+ / -</span> Zoom • <span className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-mono text-[10px]">R</span> Recenter
              </span>
            ) : (
              <span className="text-slate-600">
                Click map to enable keyboard shortcuts (<span className="font-mono text-[10px]">↑↓←→ / WASD / + / - / R</span>)
              </span>
            )}
          </span>
        </div>

        {/* Floating Top Left Place Description Overlay Card */}
        {showPlaceDescription ? (
          <div className="absolute top-4 left-4 z-20 max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-xl transition-all">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {selectedPlace.area}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedPlace.latitude.toFixed(4)}°, {selectedPlace.longitude.toFixed(4)}°
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1">{selectedPlace.place_name}</h4>
              </div>

              <button
                onClick={() => {
                  setShowPlaceDescription(false);
                  setInfoWindowOpen(false);
                }}
                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors flex-shrink-0"
                title="Close place description"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              {formatCityCountry(selectedPlace.city, selectedPlace.country)}
            </p>

            {selectedPlace.description && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-700 leading-normal font-normal bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5 text-blue-900">
                  Site Overview:
                </span>
                {selectedPlace.description}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setShowPlaceDescription(true);
              setInfoWindowOpen(true);
            }}
            className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 transition-all"
            title="Re-open place description card"
          >
            <Info className="w-4 h-4 text-blue-600" />
            <span>Show Place Description</span>
          </button>
        )}

        {/* Map Control Floating Bar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-xl border border-slate-200 shadow-lg">
          {/* Map Type Quick Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMapType('satellite')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                mapType === 'satellite' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Satellite view - High resolution orbital photos"
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Satellite</span>
            </button>

            <button
              onClick={() => setMapType('roadmap')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                mapType === 'roadmap' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Roadmap view - Street vector layout"
            >
              <MapIcon className="w-3 h-3 text-amber-300" />
              <span>Roadmap</span>
            </button>

            <button
              onClick={() => setMapType('hybrid')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                mapType === 'hybrid' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Hybrid view - Satellite with street overlay"
            >
              <Layers className="w-3 h-3 text-purple-300" />
              <span>Hybrid</span>
            </button>
          </div>

          {/* Floating Zoom & Radius Control Slider Box */}
          <div className="flex flex-col gap-1.5 bg-slate-50/95 backdrop-blur-md p-2 rounded-lg border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
              <span className="flex items-center gap-1 text-blue-700">
                <Target className="w-3 h-3 text-blue-600" />
                <span>Radius Control</span>
              </span>
              <span className="font-mono text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded text-[10px] font-extrabold">{zoom}x</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom(Math.max(2, zoom - 1))}
                className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={2}
                max={21}
                step={1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                title={`Adjust Inspection Radius (Current Zoom: ${zoom}x)`}
              />
              <button
                type="button"
                onClick={() => setZoom(Math.min(21, zoom + 1))}
                className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-emerald-800 font-medium text-center font-mono bg-emerald-50 border border-emerald-200/80 rounded py-0.5">
              {getInspectionRadius(zoom)}
            </div>
          </div>
        </div>
      </div>

      {/* Capture Snapshot Modal */}
      {showCaptureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Save Map Snapshot</h3>
              </div>
              <button
                onClick={() => setShowCaptureModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Location</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedPlace.place_name} (${formatCityCountry(selectedPlace.city, selectedPlace.country)})`}
                  className="w-full bg-slate-100 text-slate-600 px-3 py-2 rounded border border-slate-200 cursor-not-allowed"
                />
              </div>

              {/* Inspection Radius & Zoom Slider */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    <span>Snapshot Inspection Radius &amp; Zoom</span>
                  </label>
                  <span className="text-blue-800 font-mono font-bold text-xs bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200">
                    {zoom}x Zoom • <span className="text-emerald-700">{getInspectionRadius(zoom)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setZoom(Math.max(2, zoom - 1))}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 shadow-xs transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min={2}
                    max={21}
                    step={1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    title={`Adjust Snapshot Zoom Level: ${zoom}x`}
                  />
                  <button
                    type="button"
                    onClick={() => setZoom(Math.min(21, zoom + 1))}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 shadow-xs transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Snapshot Date</label>
                  <input
                    type="date"
                    value={captureDate}
                    onChange={(e) => setCaptureDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Map View Style</label>
                  <select
                    value={mapType}
                    onChange={(e: any) => setMapType(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                  >
                    <option value="satellite">🛰️ Satellite (Aerial/Trees)</option>
                    <option value="roadmap">🗺️ Roadmap (Street Vector)</option>
                    <option value="hybrid">👁️ Hybrid (Satellite + Labels)</option>
                    <option value="terrain">⛰️ Terrain (Topographic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Temporal Event Mode</label>
                  <select
                    value={simulatedEventType}
                    onChange={(e: any) => setSimulatedEventType(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Baseline">Normal / Baseline View</option>
                    <option value="Construction">Building Construction</option>
                    <option value="Accident">Car Accident / Traffic Scene</option>
                    <option value="Deforestation">Tree Cutting / Forest Clearing</option>
                    <option value="Flood">Nature Event / Water Flood</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inspector Notes &amp; Observations</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Captured today during afternoon survey. Checked for structural progress..."
                  value={captureNotes}
                  onChange={(e) => setCaptureNotes(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 p-3 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCaptureModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSnapshot(false)}
                disabled={isCapturing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow-xs disabled:opacity-50 transition-all"
              >
                {isCapturing ? 'Saving...' : 'Save to History Only'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSnapshot(true)}
                disabled={isCapturing}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isCapturing ? 'Saving...' : 'Save & Download Image'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Snapshot Capture Configuration Modal */}
      {showAutoCaptureConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Automated Map Snapshot Capture</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure time intervals to automatically record map snapshots &amp; sync to Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoCaptureConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Switch */}
            <div className={`p-4 rounded-xl border transition-all ${
              autoCaptureEnabled
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Auto-Capture Interval Engine
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      autoCaptureEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {autoCaptureEnabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {autoCaptureEnabled
                      ? `Capturing snapshots every ${autoCaptureIntervalSec}s and saving to Firestore.`
                      : 'Enable timer to automatically monitor and archive location changes.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoCaptureEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoCaptureEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Interval Preset Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Capture Time Interval
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '10s (Demo)', val: 10 },
                  { label: '30s', val: 30 },
                  { label: '1 min', val: 60 },
                  { label: '5 min', val: 300 },
                  { label: '15 min', val: 900 },
                  { label: '1 hour', val: 3600 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setAutoCaptureIntervalSec(item.val);
                      setAutoCaptureCountdown(item.val);
                    }}
                    className={`px-2.5 py-2 text-xs font-bold rounded-lg border transition-all ${
                      autoCaptureIntervalSec === item.val
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Event Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Simulated Ground Overlay Event
              </label>
              <select
                value={autoCaptureEventType}
                onChange={(e: any) => setAutoCaptureEventType(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              >
                <option value="Construction">🏗️ Building Construction Site</option>
                <option value="Accident">🚗 Traffic Incident / Road Scene</option>
                <option value="Deforestation">🌲 Forest Clearing / Vegetation Loss</option>
                <option value="Flood">🌊 Nature Event / Water Flood</option>
                <option value="Baseline">🛰️ Baseline Clear View</option>
                <option value="Random">🎲 Cycle Random Events Automatically</option>
              </select>
            </div>

            {/* Firestore Storage & Session Stats Panel */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5 border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">Firestore Storage Target</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  collection: snapshots
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Session Captures:</span>
                  <strong className="text-white font-mono text-sm">{autoCaptureCount} snapshots</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Last Auto-Capture:</span>
                  <strong className="text-emerald-300 font-mono text-xs">{lastAutoCapturedTime || 'None in this session'}</strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={executeAutoCapture}
                disabled={isCapturing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Test Trigger Now</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutoCaptureConfigModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!autoCaptureEnabled) setAutoCaptureEnabled(true);
                    setShowAutoCaptureConfigModal(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply &amp; Start Timer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
