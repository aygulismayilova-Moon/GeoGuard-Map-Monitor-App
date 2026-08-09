import React, { useState, useEffect } from 'react';
import { MapSnapshot, PlaceItem, ChangeAnalysisResult } from '../types';
import {
  Layers,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  Sliders,
  FileSearch,
  ArrowRightLeft,
  Info,
  Clock,
  Building,
  ShieldAlert,
  Download,
  Activity,
  FileText,
} from 'lucide-react';

interface SnapshotManagerProps {
  selectedPlace: PlaceItem;
  snapshots: MapSnapshot[];
  onDeleteSnapshot: (id: string) => void;
  onUpdateSnapshotNotes: (id: string, notes: string) => void;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({
  selectedPlace,
  snapshots,
  onDeleteSnapshot,
  onUpdateSnapshotNotes,
}) => {
  // Image comparison state
  const [snapshotAId, setSnapshotAId] = useState<string>('');
  const [snapshotBId, setSnapshotBId] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Gemini AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<ChangeAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Active full-screen view snapshot
  const [previewSnapshot, setPreviewSnapshot] = useState<MapSnapshot | null>(null);

  // Auto-select initial two snapshots for comparison if available
  useEffect(() => {
    if (snapshots.length >= 2) {
      // Set earliest date as Snapshot A (Baseline) and latest as Snapshot B (Today)
      const sorted = [...snapshots].sort(
        (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
      );
      setSnapshotAId(sorted[0].id);
      setSnapshotBId(sorted[sorted.length - 1].id);
    } else if (snapshots.length === 1) {
      setSnapshotAId(snapshots[0].id);
      setSnapshotBId(snapshots[0].id);
    } else {
      setSnapshotAId('');
      setSnapshotBId('');
    }
    setAiResult(null);
    setAiError(null);
  }, [snapshots, selectedPlace.id]);

  const snapA = snapshots.find((s) => s.id === snapshotAId);
  const snapB = snapshots.find((s) => s.id === snapshotBId);

  // Call Gemini AI server API route to analyze temporal image differences
  const handleRunAiAnalysis = async () => {
    if (!snapA || !snapB) return;

    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/gemini/analyze-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: selectedPlace.place_name,
          area: selectedPlace.area,
          city: selectedPlace.city,
          country: selectedPlace.country,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          dateA: snapA.dateLabel || snapA.isoDate,
          dateB: snapB.dateLabel || snapB.isoDate,
          imageA: snapA.imageUrl,
          imageB: snapB.imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze change with Gemini AI');
      }

      setAiResult(data);
    } catch (err: any) {
      console.error('Error running AI analysis', err);
      setAiError(err.message || 'Error executing Gemini AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Historical Snapshots Gallery */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Historical Map Snapshots</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded">
              {snapshots.length} Snapshots Saved
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Compare past and current snapshots to detect building construction, car accidents, nature events, or tree cutting.
          </p>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No snapshots saved for this place yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click <strong>&quot;TAKE SNAPSHOT&quot;</strong> on the map above to capture and save today&apos;s view.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {snapshots.map((snap) => {
              const isSelectedA = snap.id === snapshotAId;
              const isSelectedB = snap.id === snapshotBId;

              return (
                <div
                  key={snap.id}
                  className={`group relative bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
                    isSelectedA && isSelectedB
                      ? 'border-blue-600 ring-2 ring-blue-500/30'
                      : isSelectedA
                      ? 'border-blue-600 ring-2 ring-blue-500/20'
                      : isSelectedB
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Image Preview Container */}
                  <div className="relative h-32 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setPreviewSnapshot(snap)}>
                    <img src={snap.imageUrl} alt={snap.dateLabel} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    {/* Badge Overlay */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-slate-700">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span>{snap.dateLabel}</span>
                    </div>

                    {/* Compare Tag Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {isSelectedA && (
                        <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Image A (Baseline)
                        </span>
                      )}
                      {isSelectedB && (
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Image B (Current)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Info & Notes */}
                  <div className="p-2.5 space-y-1.5 text-xs">
                    <p className="text-slate-600 text-[11px] line-clamp-2 italic">
                      &quot;{snap.notes || 'No inspector notes added.'}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Zoom: {snap.zoomLevel}x</span>
                      <span className="capitalize">{snap.mapType}</span>
                    </div>

                    {/* Selection Controls */}
                    <div className="flex items-center justify-between gap-1 pt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSnapshotAId(snap.id)}
                          className={`px-2 py-1 text-[10px] font-bold rounded ${
                            isSelectedA ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Set A
                        </button>
                        <button
                          onClick={() => setSnapshotBId(snap.id)}
                          className={`px-2 py-1 text-[10px] font-bold rounded ${
                            isSelectedB ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Set B
                        </button>
                      </div>

                      <button
                        onClick={() => onDeleteSnapshot(snap.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Snapshot Comparison & Gemini AI Change Inspector */}
      {snapshots.length >= 2 && snapA && snapB && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Compare Two Snapshots &amp; Find Differences</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select baseline Image A and comparison Image B to inspect temporal visual changes over time.
                </p>
              </div>
            </div>

            {/* AI Execute Button */}
            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Gemini AI Analyzing Differences...' : 'Run Gemini AI Change Detection'}</span>
            </button>
          </div>

          {/* Selectors for Image A and Image B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-blue-700">
                📸 Image A (Baseline / Earliest Date)
              </label>
              <select
                value={snapshotAId}
                onChange={(e) => setSnapshotAId(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs p-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.dateLabel} - Zoom {s.zoomLevel}x ({s.notes || 'Snapshot'})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-emerald-700">
                📸 Image B (Comparison / Latest Date)
              </label>
              <select
                value={snapshotBId}
                onChange={(e) => setSnapshotBId(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs p-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.dateLabel} - Zoom {s.zoomLevel}x ({s.notes || 'Snapshot'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Comparison Split View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
              <span className="text-blue-700 font-bold">Image A: {snapA.dateLabel}</span>
              <span className="text-[11px] text-slate-500">Drag Slider to Reveal Differences</span>
              <span className="text-emerald-700 font-bold">Image B: {snapB.dateLabel}</span>
            </div>

            <div className="relative w-full h-[380px] bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shadow-inner select-none">
              {/* Image B (Underneath / Current) */}
              <img
                src={snapB.imageUrl}
                alt={snapB.dateLabel}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Image A (Top Layer / Baseline clipped by slider position) */}
              <img
                src={snapA.imageUrl}
                alt={snapA.dateLabel}
                className="absolute inset-0 w-full h-full object-cover shadow-2xl"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              />

              {/* Interactive Slider Bar Handle */}
              <input
                type="range"
                min={0}
                max={100}
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />

              {/* Visual Divider Line and Handle */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-20 flex items-center justify-center"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-1 bg-blue-600 h-full shadow-lg" />
                <div className="absolute w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md border-2 border-white">
                  ↔
                </div>
              </div>
            </div>
          </div>

          {/* AI Result Report Panel */}
          {aiError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900">Analysis Error</h4>
                <p>{aiError}</p>
              </div>
            </div>
          )}

          {aiResult && (
            <div className="bg-slate-50 border border-blue-200 rounded-lg p-4 space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Gemini Geospatial Inspection Report</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      AI Temporal Analysis between {snapA.dateLabel} and {snapB.dateLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Change Type Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                      aiResult.changeDetected
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {aiResult.changeType || 'Change Detected'}
                  </span>

                  {/* Confidence Score Badge */}
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-slate-200">
                    Confidence: {aiResult.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Executive Summary</h5>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">{aiResult.summary}</p>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Visual Comparison Details</h5>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {aiResult.detailedAnalysis}
                  </p>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200 space-y-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                      Affected Quad-Zones
                    </h5>
                    <ul className="space-y-1">
                      {aiResult.changedAreas?.map((area, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-center gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                      Actionable Recommendations
                    </h5>
                    <ul className="space-y-1">
                      {aiResult.actionableRecommendations?.map((rec, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Resolution Image Preview Modal */}
      {previewSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedPlace.place_name}</h3>
                <p className="text-xs text-slate-400">{previewSnapshot.dateLabel}</p>
              </div>
              <button onClick={() => setPreviewSnapshot(null)} className="text-slate-400 hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 max-h-[500px]">
              <img src={previewSnapshot.imageUrl} alt={previewSnapshot.dateLabel} className="w-full h-full object-contain bg-black" />
            </div>

            <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 italic">
              &quot;{previewSnapshot.notes || 'No inspector notes.'}&quot;
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
