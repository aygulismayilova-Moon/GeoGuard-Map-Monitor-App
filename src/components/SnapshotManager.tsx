import React, { useState, useEffect, useMemo } from 'react';
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
  Copy,
  Check,
  Printer,
  Maximize2,
  ShieldCheck,
  X,
  Share2,
  CalendarRange,
  RotateCcw,
  Filter,
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
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side');

  // Gemini AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<ChangeAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Report extraction and modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Active full-screen view snapshot
  const [previewSnapshot, setPreviewSnapshot] = useState<MapSnapshot | null>(null);

  // Date Range Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'all' | '7days' | '30days' | '90days' | 'thisYear' | 'custom'>('all');

  // Reset date range filter when selected place changes
  useEffect(() => {
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
  }, [selectedPlace.id]);

  // Handle date preset selection
  const applyPreset = (preset: 'all' | '7days' | '30days' | '90days' | 'thisYear') => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '90days') {
      const past = new Date();
      past.setDate(past.getDate() - 90);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisYear') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(todayStr);
    }
  };

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
  };

  // Filter snapshots based on date bounds
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      let snapDateStr = snap.isoDate;
      if (!snapDateStr && snap.capturedAt) {
        try {
          snapDateStr = new Date(snap.capturedAt).toISOString().split('T')[0];
        } catch (_) {
          snapDateStr = '';
        }
      }
      if (!snapDateStr) return true;

      if (startDate && snapDateStr < startDate) return false;
      if (endDate && snapDateStr > endDate) return false;
      return true;
    });
  }, [snapshots, startDate, endDate]);

  // Auto-select initial two snapshots for comparison if available within filtered range
  useEffect(() => {
    if (filteredSnapshots.length >= 2) {
      // Set earliest date as Snapshot A (Baseline) and latest as Snapshot B (Today)
      const sorted = [...filteredSnapshots].sort(
        (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
      );
      const hasA = filteredSnapshots.some((s) => s.id === snapshotAId);
      const hasB = filteredSnapshots.some((s) => s.id === snapshotBId);

      if (!hasA || !hasB || snapshotAId === snapshotBId) {
        setSnapshotAId(sorted[0].id);
        setSnapshotBId(sorted[sorted.length - 1].id);
      }
    } else if (filteredSnapshots.length === 1) {
      setSnapshotAId(filteredSnapshots[0].id);
      setSnapshotBId(filteredSnapshots[0].id);
    } else {
      setSnapshotAId('');
      setSnapshotBId('');
    }
    setAiResult(null);
    setAiError(null);
  }, [filteredSnapshots, selectedPlace.id]);

  const snapA = filteredSnapshots.find((s) => s.id === snapshotAId) || snapshots.find((s) => s.id === snapshotAId);
  const snapB = filteredSnapshots.find((s) => s.id === snapshotBId) || snapshots.find((s) => s.id === snapshotBId);

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

  // Helper to format analysis report into text document
  const generateReportText = () => {
    if (!aiResult || !snapA || !snapB) return '';
    return `============================================================
       GEOGUARD SATELLITE INSPECTION REPORT                 
============================================================
Target Location : ${selectedPlace.place_name} (${selectedPlace.area}, ${selectedPlace.city}, ${selectedPlace.country})
Coordinates     : Lat ${selectedPlace.latitude}, Lng ${selectedPlace.longitude}
Baseline Image A: ${snapA.dateLabel} (Zoom ${snapA.zoomLevel}x, ${snapA.mapType})
Current Image B : ${snapB.dateLabel} (Zoom ${snapB.zoomLevel}x, ${snapB.mapType})
Generated Date  : ${new Date().toLocaleString()}
------------------------------------------------------------
RISK ASSESSMENT METRICS
------------------------------------------------------------
Change Detected : ${aiResult.changeDetected ? 'YES' : 'NO'}
Change Type     : ${aiResult.changeType || 'Geospatial Surface Variance'}
Severity Level  : ${aiResult.severity || 'Medium'}
Confidence Score: ${aiResult.confidenceScore}%
------------------------------------------------------------
EXECUTIVE SUMMARY
------------------------------------------------------------
${aiResult.summary}

------------------------------------------------------------
VISUAL COMPARISON DETAILS
------------------------------------------------------------
${aiResult.detailedAnalysis}

------------------------------------------------------------
AFFECTED QUAD-ZONES
------------------------------------------------------------
${aiResult.changedAreas?.map((area) => ` - ${area}`).join('\n') || 'None'}

------------------------------------------------------------
ACTIONABLE FIELD RECOMMENDATIONS
------------------------------------------------------------
${aiResult.actionableRecommendations?.map((rec) => ` [✓] ${rec}`).join('\n') || 'None'}
============================================================
GeoGuard Satellite Platform • Real-time Geospatial Monitoring
============================================================`;
  };

  const handleCopyReportText = () => {
    const text = generateReportText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadTxtReport = () => {
    const text = generateReportText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GeoGuard_Report_${selectedPlace.place_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonReport = () => {
    if (!aiResult || !snapA || !snapB) return;
    const payload = {
      reportType: 'GeoGuard Geospatial Inspection Report',
      generatedAt: new Date().toISOString(),
      location: {
        id: selectedPlace.id,
        name: selectedPlace.place_name,
        area: selectedPlace.area,
        city: selectedPlace.city,
        country: selectedPlace.country,
        coordinates: { lat: selectedPlace.latitude, lng: selectedPlace.longitude },
      },
      comparisonSnapshots: {
        baseline: {
          id: snapA.id,
          dateLabel: snapA.dateLabel,
          isoDate: snapA.isoDate,
          zoomLevel: snapA.zoomLevel,
          mapType: snapA.mapType,
        },
        current: {
          id: snapB.id,
          dateLabel: snapB.dateLabel,
          isoDate: snapB.isoDate,
          zoomLevel: snapB.zoomLevel,
          mapType: snapB.mapType,
        },
      },
      analysis: aiResult,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GeoGuard_Report_${selectedPlace.place_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Date Range Picker Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shadow-xs">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Filter Snapshots by Date Range</h3>
                {(startDate || endDate) && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
                    {filteredSnapshots.length} of {snapshots.length} Matched
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Filter historical map snapshots captured for {selectedPlace.place_name} by date range.
              </p>
            </div>
          </div>

          {(startDate || endDate) && (
            <button
              onClick={handleClearDateFilter}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Date Filter</span>
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Custom Date Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <label className="text-[11px] font-bold text-slate-600">Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <label className="text-[11px] font-bold text-slate-600">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activePreset === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => applyPreset('7days')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activePreset === '7days'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('30days')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activePreset === '30days'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('90days')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activePreset === '90days'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 90 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisYear')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                activePreset === 'thisYear'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {/* Historical Snapshots Gallery */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Historical Map Snapshots</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded">
              {filteredSnapshots.length === snapshots.length
                ? `${snapshots.length} Snapshots Saved`
                : `Showing ${filteredSnapshots.length} of ${snapshots.length} Snapshots`}
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
        ) : filteredSnapshots.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl space-y-2">
            <CalendarRange className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">No snapshots match the selected date range.</p>
            <p className="text-xs text-slate-500">
              No historical map snapshots captured for <strong>{selectedPlace.place_name}</strong> between{' '}
              <strong>{startDate || 'Beginning'}</strong> and <strong>{endDate || 'Today'}</strong>.
            </p>
            <button
              onClick={handleClearDateFilter}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow-xs transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Date Range Filter</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredSnapshots.map((snap) => {
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
                  <div className="relative h-52 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setPreviewSnapshot(snap)}>
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
      {filteredSnapshots.length >= 2 && snapA && snapB ? (
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

          {/* Selectors and Comparison View Mode Toggle */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" /> Comparison Mode:
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    comparisonMode === 'side-by-side'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Side-by-Side Dual View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('slider')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    comparisonMode === 'slider'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Interactive Slider Wipe</span>
                </button>
              </div>
            </div>

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
                  {filteredSnapshots.map((s) => (
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
                  {filteredSnapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.dateLabel} - Zoom {s.zoomLevel}x ({s.notes || 'Snapshot'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dual-Panel Side-by-Side Comparison View */}
          {comparisonMode === 'side-by-side' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-100 pb-2">
                <span className="text-blue-700 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Baseline Image A: {snapA.dateLabel}
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                  Side-by-Side Dual Panel
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Comparison Image B: {snapB.dateLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel A: Baseline */}
                <div className="bg-slate-900 border border-slate-300 rounded-xl overflow-hidden shadow-sm space-y-0">
                  <div className="bg-blue-900/80 text-blue-100 px-3 py-2 text-xs font-bold flex items-center justify-between border-b border-blue-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Image A (Baseline)
                    </span>
                    <span className="font-mono text-[11px] text-blue-200">{snapA.dateLabel}</span>
                  </div>

                  <div className="relative h-[480px] bg-slate-950 flex items-center justify-center overflow-hidden group">
                    <img
                      src={snapA.imageUrl}
                      alt={snapA.dateLabel}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() => setPreviewSnapshot(snapA)}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewSnapshot(snapA)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs border border-slate-700 shadow-md text-xs font-semibold flex items-center gap-1"
                        title="View Full Screen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Enlarge</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/90 text-slate-200 text-xs space-y-1.5 border-t border-slate-700">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Zoom: {snapA.zoomLevel}x</span>
                      <span className="capitalize">{snapA.mapType}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic line-clamp-2">
                      &quot;{snapA.notes || 'Baseline record.'}&quot;
                    </p>
                  </div>
                </div>

                {/* Panel B: Comparison */}
                <div className="bg-slate-900 border border-slate-300 rounded-xl overflow-hidden shadow-sm space-y-0">
                  <div className="bg-emerald-900/80 text-emerald-100 px-3 py-2 text-xs font-bold flex items-center justify-between border-b border-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Image B (Current)
                    </span>
                    <span className="font-mono text-[11px] text-emerald-200">{snapB.dateLabel}</span>
                  </div>

                  <div className="relative h-[480px] bg-slate-950 flex items-center justify-center overflow-hidden group">
                    <img
                      src={snapB.imageUrl}
                      alt={snapB.dateLabel}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() => setPreviewSnapshot(snapB)}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewSnapshot(snapB)}
                        className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs border border-slate-700 shadow-md text-xs font-semibold flex items-center gap-1"
                        title="View Full Screen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Enlarge</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/90 text-slate-200 text-xs space-y-1.5 border-t border-slate-700">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Zoom: {snapB.zoomLevel}x</span>
                      <span className="capitalize">{snapB.mapType}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic line-clamp-2">
                      &quot;{snapB.notes || 'Comparison record.'}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Comparison Split View (Slider Wipe) */}
          {comparisonMode === 'slider' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
                <span className="text-blue-700 font-bold">Image A: {snapA.dateLabel}</span>
                <span className="text-[11px] text-slate-500">Drag Slider to Reveal Differences</span>
                <span className="text-emerald-700 font-bold">Image B: {snapB.dateLabel}</span>
              </div>

              <div className="relative w-full max-w-lg mx-auto h-[520px] bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shadow-inner select-none">
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
          )}

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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
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

                <div className="flex flex-wrap items-center gap-2">
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

                  {/* Expand Full Report Button */}
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>View Full Report</span>
                  </button>
                </div>
              </div>

              {/* Extract / Export Report Bar */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Extract / Export Analysis Report:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handleCopyReportText}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50 shadow-sm transition-all"
                    title="Copy formatted text report to clipboard"
                  >
                    {copiedState ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                    <span>{copiedState ? 'Copied!' : 'Copy Text'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxtReport}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50 shadow-sm transition-all"
                    title="Download .TXT report file"
                  >
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span>Export .TXT</span>
                  </button>

                  <button
                    onClick={handleDownloadJsonReport}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50 shadow-sm transition-all"
                    title="Download raw JSON report data"
                  >
                    <FileSearch className="w-3 h-3 text-emerald-600" />
                    <span>Export .JSON</span>
                  </button>

                  <button
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded hover:bg-slate-50 shadow-sm transition-all"
                    title="Print or Save PDF report"
                  >
                    <Printer className="w-3 h-3 text-purple-600" />
                    <span>Print PDF</span>
                  </button>
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
      ) : snapshots.length >= 2 && filteredSnapshots.length < 2 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center space-y-3">
          <Info className="w-8 h-8 text-blue-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">Expand Date Filter to Compare Snapshots</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have {filteredSnapshots.length} snapshot matched in this date range out of {snapshots.length} total saved snapshots. At least 2 snapshots are needed to run Gemini AI temporal change detection.
          </p>
          <button
            onClick={handleClearDateFilter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Show All Snapshots</span>
          </button>
        </div>
      ) : null}

      {/* Full Detailed Inspection Report Modal */}
      {isReportModalOpen && aiResult && snapA && snapB && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                      OFFICIAL REPORT
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">CONFIDENTIAL</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">GeoGuard Satellite Inspection Report</h3>
                </div>
              </div>

              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
              {/* Location & Metadata Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Monitored Site</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedPlace.place_name}</p>
                  <p className="text-slate-500 font-medium">{selectedPlace.area}, {selectedPlace.city}, {selectedPlace.country}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geographic Coordinates</span>
                  <p className="text-xs font-mono font-bold text-blue-700 mt-0.5">
                    Lat {selectedPlace.latitude}, Lng {selectedPlace.longitude}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Side-by-Side Comparison Snapshot Thumbnails */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Snapshot Temporal Pair (Vertical 480x720)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-100 border border-blue-200 rounded-xl p-2 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      Baseline Image A: {snapA.dateLabel}
                    </span>
                    <div className="h-44 rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                      <img src={snapA.imageUrl} alt={snapA.dateLabel} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Zoom Level: {snapA.zoomLevel}x • {snapA.mapType}</p>
                  </div>

                  <div className="bg-slate-100 border border-emerald-200 rounded-xl p-2 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      Comparison Image B: {snapB.dateLabel}
                    </span>
                    <div className="h-44 rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                      <img src={snapB.imageUrl} alt={snapB.dateLabel} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Zoom Level: {snapB.zoomLevel}x • {snapB.mapType}</p>
                  </div>
                </div>
              </div>

              {/* Key Metrics Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Change Detected</span>
                  <p className="text-sm font-black text-amber-900 mt-1">{aiResult.changeDetected ? 'YES' : 'NO'}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Change Classification</span>
                  <p className="text-xs font-bold text-blue-900 mt-1">{aiResult.changeType || 'Geospatial Variance'}</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">AI Confidence Score</span>
                  <p className="text-sm font-black text-purple-900 mt-1">{aiResult.confidenceScore}%</p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Executive Inspection Summary</h4>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">{aiResult.summary}</p>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detailed Visual Analysis</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">{aiResult.detailedAnalysis}</p>
              </div>

              {/* Affected Sectors & Actionable Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Affected Sector Quad-Zones</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {aiResult.changedAreas?.map((area, idx) => (
                      <li key={idx} className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Actionable Recommendations</h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {aiResult.actionableRecommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer / Extract Toolbar */}
            <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Extract Report Options:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyReportText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedState ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>

                <button
                  onClick={handleDownloadTxtReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>

                <button
                  onClick={handleDownloadJsonReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>Download .JSON</span>
                </button>

                <button
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </div>
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
