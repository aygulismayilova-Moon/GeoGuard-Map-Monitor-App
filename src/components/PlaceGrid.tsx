import React, { useState, useMemo } from 'react';
import { PlaceItem, FilterState } from '../types';
import { Search, MapPin, Eye, Filter, ArrowUpDown, Plus, Trash2, Globe, Building2, Tag, Layers } from 'lucide-react';

interface PlaceGridProps {
  places: PlaceItem[];
  selectedPlaceId: string | null;
  snapshotsMap: Record<string, number>;
  onSelectPlace: (place: PlaceItem) => void;
  onAddPlace: () => void;
  onDeletePlace: (id: string) => void;
  onOpenUploadModal: () => void;
}

export const PlaceGrid: React.FC<PlaceGridProps> = ({
  places,
  selectedPlaceId,
  snapshotsMap,
  onSelectPlace,
  onAddPlace,
  onDeletePlace,
  onOpenUploadModal,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    area: '',
    city: '',
    country: '',
  });

  const [sortField, setSortField] = useState<keyof PlaceItem>('place_name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Extract unique Areas, Cities, Countries for filter dropdowns
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => p.area && set.add(p.area));
    return Array.from(set).sort();
  }, [places]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => p.city && set.add(p.city));
    return Array.from(set).sort();
  }, [places]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => p.country && set.add(p.country));
    return Array.from(set).sort();
  }, [places]);

  // Filtered & Sorted Places
  const filteredPlaces = useMemo(() => {
    return places
      .filter((place) => {
        const query = filters.searchQuery.toLowerCase();
        const matchesQuery =
          !query ||
          place.place_name.toLowerCase().includes(query) ||
          place.area.toLowerCase().includes(query) ||
          place.street.toLowerCase().includes(query) ||
          place.city.toLowerCase().includes(query) ||
          place.country.toLowerCase().includes(query) ||
          place.description.toLowerCase().includes(query);

        const matchesArea = !filters.area || place.area === filters.area;
        const matchesCity = !filters.city || place.city === filters.city;
        const matchesCountry = !filters.country || place.country === filters.country;

        return matchesQuery && matchesArea && matchesCity && matchesCountry;
      })
      .sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [places, filters, sortField, sortAsc]);

  const handleSort = (field: keyof PlaceItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleResetFilters = () => {
    setFilters({ searchQuery: '', area: '', city: '', country: '' });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Dataset Header and Filters Bar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Dataset: monitored_locations.csv ({filteredPlaces.length} of {places.length} entries)
            </span>
            <div className="flex gap-2 text-[11px]">
              {(filters.searchQuery || filters.area || filters.city || filters.country) && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                  Filters Active
                </span>
              )}
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                Sorted: {String(sortField)} ({sortAsc ? 'Asc' : 'Desc'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddPlace}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Add Single Place
            </button>
            <button
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors"
            >
              Upload CSV
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search place name, street..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs pl-8 pr-3 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={filters.area}
              onChange={(e) => setFilters({ ...filters, area: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Areas ({uniqueAreas.length})</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Countries ({uniqueCountries.length})</option>
              {uniqueCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            {(filters.searchQuery || filters.area || filters.city || filters.country) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium whitespace-nowrap"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High Density Table */}
      <div className="overflow-x-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-300">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 font-semibold w-12 text-center">Action</th>
              <th className="px-4 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('place_name')}>
                <div className="flex items-center gap-1">
                  <span>Place Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('area')}>
                <div className="flex items-center gap-1">
                  <span>Area</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('city')}>
                <div className="flex items-center gap-1">
                  <span>City/Country</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-2 font-semibold">Coordinates</th>
              <th className="px-4 py-2 font-semibold">Snaps</th>
              <th className="px-4 py-2 font-semibold">Description</th>
              <th className="px-4 py-2 font-semibold text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
            {filteredPlaces.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-1.5">
                    <MapPin className="w-7 h-7 text-slate-400" />
                    <p className="font-semibold text-slate-700">No places match the criteria</p>
                    <p className="text-[11px] text-slate-400">
                      Try clearing filters or uploading a CSV file.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPlaces.map((place) => {
                const isSelected = place.id === selectedPlaceId;
                const snapCount = snapshotsMap[place.id] || 0;

                return (
                  <tr
                    key={place.id}
                    className={`transition-colors border-b border-slate-100 ${
                      isSelected
                        ? 'bg-blue-50/60 font-medium border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50 cursor-default'
                    }`}
                  >
                    {/* Action button */}
                    <td className="px-4 py-1.5 text-center">
                      <button
                        onClick={() => onSelectPlace(place)}
                        className={`px-3 py-1 rounded text-xs font-medium shadow-sm transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100 bg-white'
                        }`}
                        title="Focus map on this location"
                      >
                        Find Map
                      </button>
                    </td>

                    {/* ID */}
                    <td className="px-4 py-1.5 font-mono text-slate-400">#{place.id}</td>

                    {/* Place Name */}
                    <td className="px-4 py-1.5 font-semibold text-slate-900">
                      <div>
                        <span>{place.place_name}</span>
                        <div className="text-[10px] text-slate-400 font-normal">{place.street}</div>
                      </div>
                    </td>

                    {/* Area */}
                    <td className="px-4 py-1.5 text-slate-600">{place.area || 'N/A'}</td>

                    {/* City / Country */}
                    <td className="px-4 py-1.5 text-slate-600">
                      {place.city}, {place.country}
                    </td>

                    {/* Coordinates */}
                    <td className="px-4 py-1.5 text-slate-500 font-mono text-[11px]">
                      {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                    </td>

                    {/* Snapshots Count */}
                    <td className="px-4 py-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        <Layers className="w-3 h-3 text-blue-600" />
                        {snapCount}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-1.5 text-slate-500 max-w-xs truncate" title={place.description}>
                      {place.description}
                    </td>

                    {/* Remove Action */}
                    <td className="px-4 py-1.5 text-right">
                      <button
                        onClick={() => onDeletePlace(place.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete place"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
