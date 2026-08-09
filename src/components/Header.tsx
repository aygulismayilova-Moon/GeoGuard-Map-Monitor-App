import React from 'react';
import { MapPin, FileSpreadsheet, Upload, Download, Sparkles, Key, Layers, Siren, Bell, RefreshCw } from 'lucide-react';

interface HeaderProps {
  placesCount: number;
  totalSnapshotsCount: number;
  hasGoogleMapsKey: boolean;
  hasGeminiKey: boolean;
  activeAlarmsCount?: number;
  activeIncidentsCount?: number;
  onOpenUploadModal: () => void;
  onLoadSampleData: () => void;
  onDownloadCsv: () => void;
  onOpenApiKeyHelp: () => void;
  onOpenAccidentScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  placesCount,
  totalSnapshotsCount,
  hasGoogleMapsKey,
  hasGeminiKey,
  activeAlarmsCount = 0,
  activeIncidentsCount = 0,
  onOpenUploadModal,
  onLoadSampleData,
  onDownloadCsv,
  onOpenApiKeyHelp,
  onOpenAccidentScanner,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                  TERRA-OBSERVE
                </h1>
                <span className="text-slate-400 font-normal text-xs">v2.5.0</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded">
                  Gemma 4 AI &amp; Alarms
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                High-Density Geospatial Area Control, Snapshot Archiving &amp; City Accident Alarm Detector
              </p>
            </div>
          </div>

          {/* Quick Metrics & API Key Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500 font-medium">Places:</span>
              <span className="font-bold text-slate-800">{placesCount}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-500 font-medium">Snapshots:</span>
              <span className="font-bold text-slate-800">{totalSnapshotsCount}</span>
            </div>

            {/* Gemma 4 Accident Detector & Siren Button */}
            {onOpenAccidentScanner && (
              <button
                onClick={onOpenAccidentScanner}
                className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-bold transition-all shadow-sm ${
                  activeIncidentsCount > 0
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                }`}
                title="Open Gemma 4 Accident & Disaster Detector with Alarms"
              >
                <Siren className={`w-3.5 h-3.5 ${activeIncidentsCount > 0 ? 'text-white' : 'text-rose-600'}`} />
                <span>Gemma 4 Accidents</span>
                {activeAlarmsCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-white text-rose-700 text-[10px] font-extrabold rounded-full">
                    {activeAlarmsCount} Alarms
                  </span>
                )}
              </button>
            )}

            {/* API Keys Indicator Button */}
            <button
              onClick={onOpenApiKeyHelp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
              title="Click for API Key Setup Info"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium">Keys:</span>
              <span className={`w-2 h-2 rounded-full ${hasGoogleMapsKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-slate-500">Maps</span>
              <span className={`w-2 h-2 rounded-full ${hasGeminiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-slate-500">Gemini</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV
            </button>

            <button
              onClick={onDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors"
              title="Export places dataset to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>

            <button
              onClick={onLoadSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors"
              title="Reset to sample demo dataset"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Sample Data
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
