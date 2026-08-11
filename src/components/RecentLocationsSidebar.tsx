import React from 'react';
import { PlaceItem } from '../types';
import { History, MapPin, Navigation, Tag, RotateCcw, Sparkles, Building2, ChevronRight, Layers } from 'lucide-react';

interface RecentLocationsSidebarProps {
  places: PlaceItem[];
  recentIds: string[];
  selectedPlaceId: string;
  onSelectPlace: (place: PlaceItem) => void;
  onClearRecent: () => void;
  snapshotsMap?: Record<string, number>;
}

export const getCategoryBadgeStyle = (category?: string) => {
  if (!category) return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
  const cat = category.toLowerCase();
  if (cat.includes('construct') || cat.includes('build')) {
    return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200';
  }
  if (cat.includes('environ') || cat.includes('forest') || cat.includes('vegetat') || cat.includes('nature') || cat.includes('tree')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
  }
  if (cat.includes('infrastruct') || cat.includes('traffic') || cat.includes('road') || cat.includes('interchange')) {
    return 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200';
  }
  if (cat.includes('coast') || cat.includes('water') || cat.includes('marine') || cat.includes('harbor')) {
    return 'bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200';
  }
  if (cat.includes('urban') || cat.includes('develop') || cat.includes('park')) {
    return 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200';
  }
  if (cat.includes('public') || cat.includes('civic') || cat.includes('promenade')) {
    return 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
};

export const RecentLocationsSidebar: React.FC<RecentLocationsSidebarProps> = ({
  places,
  recentIds,
  selectedPlaceId,
  onSelectPlace,
  onClearRecent,
  snapshotsMap = {},
}) => {
  // Map recentIds to actual PlaceItem objects, retaining order and filtering out deleted items
  const recentPlaces = recentIds
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is PlaceItem => p !== undefined)
    .slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3.5">
      {/* Sidebar Section Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
            <History className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Locations</h3>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-blue-200">
                {recentPlaces.length}/5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Quick-access history for recent map views</p>
          </div>
        </div>

        {recentPlaces.length > 0 && (
          <button
            type="button"
            onClick={onClearRecent}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            title="Clear recently visited locations history"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Quick Access Location List */}
      {recentPlaces.length === 0 ? (
        <div className="p-4 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-1">
          <Building2 className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No Recent Locations Visited</p>
          <p className="text-[11px] text-slate-500">
            Select any location row in the dataset or map to populate your quick-access panel.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentPlaces.map((place, index) => {
            const isSelected = place.id === selectedPlaceId;
            const categoryLabel = place.category || 'Custom Location';
            const badgeStyle = getCategoryBadgeStyle(categoryLabel);
            const snapCount = snapshotsMap[place.id] || 0;

            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className={`group relative p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400/30'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Rank Badge */}
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border font-mono flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700'
                        : index === 0
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={place.place_name}>
                        {place.place_name}
                      </span>
                      {isSelected && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>ACTIVE FOCUS</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap">
                      <span className="truncate">{place.area} • {place.city}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-blue-700 text-[10px]">
                        {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${badgeStyle}`}>
                        <Tag className="w-2.5 h-2.5 opacity-70" />
                        <span>{categoryLabel}</span>
                      </span>

                      {snapCount > 0 && (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                          {snapCount} snap{snapCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Jump Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlace(place);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all flex-shrink-0 shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white border border-slate-200'
                  }`}
                  title="Jump to this location on map"
                >
                  <Navigation className="w-3 h-3" />
                  <span className="hidden sm:inline">Jump</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
