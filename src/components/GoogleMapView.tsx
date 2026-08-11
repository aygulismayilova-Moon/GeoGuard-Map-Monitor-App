import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlaceItem, MapSnapshot } from '../types';
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
} from 'lucide-react';
import { generateSyntheticMapSnapshot, captureGoogleMapSnapshot } from '../utils/mapImageCanvas';
import html2canvas from 'html2canvas';

interface GoogleMapViewProps {
  selectedPlace: PlaceItem;
  hasGoogleMapsKey: boolean;
  onSnapshotCaptured: (snapshot: MapSnapshot) => void;
  onOpenApiKeyHelp: () => void;
}

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

  // Current map center state (supports panning via keyboard or controls)
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: selectedPlace.latitude,
    lng: selectedPlace.longitude,
  });

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

  // Handle taking a manual map snapshot
  const handleConfirmSnapshot = async () => {
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
                {selectedPlace.street}, {selectedPlace.city}, {selectedPlace.country} ({selectedPlace.latitude.toFixed(4)}° N, {selectedPlace.longitude.toFixed(4)}° E)
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
              onClick={() => setShowCaptureModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>TAKE SNAPSHOT</span>
            </button>
          </div>
        </div>

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
                    <p className="text-[11px] text-slate-600 mt-0.5">{selectedPlace.street}, {selectedPlace.city}</p>
                    <p className="text-[10px] text-slate-500 italic mt-1">{selectedPlace.description}</p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          /* High Fidelity Canvas Map Fallback when no Google Maps Key */
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-100">
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
              {selectedPlace.street}, {selectedPlace.city}, {selectedPlace.country}
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

          {/* Zoom Buttons */}
          <div className="flex items-center justify-between bg-slate-50 p-1 rounded border border-slate-200 text-xs text-slate-700">
            <button
              onClick={() => setZoom(Math.max(2, zoom - 1))}
              className="p-1 hover:bg-slate-200 rounded text-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-blue-700 font-bold px-2 text-xs">{zoom}x</span>
            <button
              onClick={() => setZoom(Math.min(21, zoom + 1))}
              className="p-1 hover:bg-slate-200 rounded text-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
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
                  value={`${selectedPlace.place_name} (${selectedPlace.city}, ${selectedPlace.country})`}
                  className="w-full bg-slate-100 text-slate-600 px-3 py-2 rounded border border-slate-200 cursor-not-allowed"
                />
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowCaptureModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSnapshot}
                disabled={isCapturing}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-md disabled:opacity-50"
              >
                {isCapturing ? 'Saving...' : 'Save Snapshot to History'}
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
