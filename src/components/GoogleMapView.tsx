import React, { useState, useEffect, useRef } from 'react';
import { PlaceItem, MapSnapshot } from '../types';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Camera, ZoomIn, ZoomOut, Layers, MapPin, Sparkles, Key, CheckCircle2, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { generateSyntheticMapSnapshot } from '../utils/mapImageCanvas';
import html2canvas from 'html2canvas';

interface GoogleMapViewProps {
  selectedPlace: PlaceItem;
  hasGoogleMapsKey: boolean;
  onSnapshotCaptured: (snapshot: MapSnapshot) => void;
  onOpenApiKeyHelp: () => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  selectedPlace,
  hasGoogleMapsKey,
  onSnapshotCaptured,
  onOpenApiKeyHelp,
}) => {
  const [zoom, setZoom] = useState<number>(16);
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap' | 'terrain'>('satellite');
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [simulatedEventType, setSimulatedEventType] = useState<'Baseline' | 'Construction' | 'Accident' | 'Deforestation' | 'Flood'>('Construction');
  const [showCaptureModal, setShowCaptureModal] = useState<boolean>(false);
  const [captureNotes, setCaptureNotes] = useState<string>('');
  const [captureDate, setCaptureDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [mapsError, setMapsError] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '' && !mapsError;

  // Center coordinates
  const center = { lat: selectedPlace.latitude, lng: selectedPlace.longitude };

  // Handle taking a map snapshot
  const handleConfirmSnapshot = async () => {
    setIsCapturing(true);

    try {
      let imageDataUrl = '';

      // If map element is rendered and html2canvas works, capture DOM, otherwise generate high-res synthetic snapshot canvas
      if (hasValidKey && mapContainerRef.current) {
        try {
          const canvas = await html2canvas(mapContainerRef.current, {
            useCORS: true,
            allowTaint: true,
            scale: 1.5,
          });
          imageDataUrl = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('html2canvas capture fallback to map canvas generator', e);
        }
      }

      if (!imageDataUrl || imageDataUrl.length < 100) {
        imageDataUrl = generateSyntheticMapSnapshot({
          placeName: selectedPlace.place_name,
          eventType: simulatedEventType,
          dateText: `${captureDate} - ${simulatedEventType}`,
          lat: selectedPlace.latitude,
          lng: selectedPlace.longitude,
          zoom: zoom,
          mapType: mapType,
        });
      }

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
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
      {/* View Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{selectedPlace.place_name}</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                {selectedPlace.area}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {selectedPlace.street}, {selectedPlace.city}, {selectedPlace.country} ({selectedPlace.latitude.toFixed(4)}° N, {selectedPlace.longitude.toFixed(4)}° E)
            </p>
          </div>
        </div>

        {/* Snapshot Capture Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCaptureModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>TAKE SNAPSHOT</span>
          </button>
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
      <div className="relative w-full h-[420px] bg-slate-100" ref={mapContainerRef}>
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              center={center}
              zoom={zoom}
              mapTypeId={mapType}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              onCameraChanged={(ev) => setZoom(ev.detail.zoom)}
            >
              <AdvancedMarker position={center} onClick={() => setInfoWindowOpen(true)}>
                <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#1d4ed8" />
              </AdvancedMarker>

              {infoWindowOpen && (
                <InfoWindow position={center} onCloseClick={() => setInfoWindowOpen(false)}>
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
                lat: selectedPlace.latitude,
                lng: selectedPlace.longitude,
                zoom: zoom,
                mapType: mapType,
              })}
              alt="Interactive Map View"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Floating Top Left Overlay Tag */}
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-md">
          <div className="text-[10px] uppercase text-slate-500 font-bold leading-none mb-1">Live Map View</div>
          <div className="text-xs font-semibold text-slate-800">{selectedPlace.latitude.toFixed(4)}° N, {selectedPlace.longitude.toFixed(4)}° E</div>
        </div>

        {/* Map Control Floating Bar */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-slate-200 shadow-md">
          {/* Map Type Selector */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border border-slate-200">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 text-[11px] font-semibold rounded ${
                mapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2 py-1 text-[11px] font-semibold rounded ${
                mapType === 'hybrid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-1 text-[11px] font-semibold rounded ${
                mapType === 'roadmap' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Roadmap
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

              <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
};
