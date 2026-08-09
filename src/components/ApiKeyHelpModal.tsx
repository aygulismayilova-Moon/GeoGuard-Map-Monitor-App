import React from 'react';
import { Key, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface ApiKeyHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasGoogleMapsKey: boolean;
  hasGeminiKey: boolean;
}

export const ApiKeyHelpModal: React.FC<ApiKeyHelpModalProps> = ({
  isOpen,
  onClose,
  hasGoogleMapsKey,
  hasGeminiKey,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
              <Key className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">API Key Setup &amp; Configuration</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configure Google Maps and Gemini AI keys in AI Studio Secrets</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Current Key Status */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`p-3 rounded border text-xs space-y-1 ${hasGoogleMapsKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Google Maps Key</span>
              <span className={`w-2.5 h-2.5 rounded-full ${hasGoogleMapsKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              {hasGoogleMapsKey ? 'Configured & Active' : 'Optional Mode Active (Canvas Map enabled)'}
            </p>
          </div>

          <div className={`p-3 rounded border text-xs space-y-1 ${hasGeminiKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Gemini AI Key</span>
              <span className={`w-2.5 h-2.5 rounded-full ${hasGeminiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              {hasGeminiKey ? 'Configured & Active' : 'Required for AI Change Analysis'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2.5 text-xs text-slate-700">
          <h4 className="font-bold text-blue-700 uppercase tracking-wider text-[11px]">
            To Add or Update Secrets in AI Studio:
          </h4>

          <ol className="list-decimal list-inside space-y-1.5 bg-slate-50 p-3.5 rounded border border-slate-200 leading-relaxed text-slate-800 font-medium">
            <li>
              Open <strong>Settings</strong> (⚙️ gear icon in top-right corner of AI Studio).
            </li>
            <li>
              Select <strong>Secrets</strong>.
            </li>
            <li>
              Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> for live Google Maps JS SDK rendering.
            </li>
            <li>
              Add <code>GEMINI_API_KEY</code> for automated AI image difference detection.
            </li>
            <li>
              Press <strong>Enter</strong> to save. The application automatically updates with your keys attached!
            </li>
          </ol>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-medium">Get Google Maps Platform API Key:</span>
            <a
              href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
            >
              Google Maps Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button onClick={onClose} className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm">
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
