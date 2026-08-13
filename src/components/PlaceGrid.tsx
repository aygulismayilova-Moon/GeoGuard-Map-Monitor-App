import React, { useState, useMemo, useEffect } from 'react';
import { PlaceItem, FilterState, STANDARD_PLACE_CATEGORIES } from '../types';
import { Search, MapPin, Eye, Filter, ArrowUpDown, Plus, Trash2, Globe, Building2, Tag, Layers, AlertTriangle, X, Pencil } from 'lucide-react';

interface PlaceGridProps {
  places: PlaceItem[];
  selectedPlaceId: string | null;
  snapshotsMap: Record<string, number>;
  onSelectPlace: (place: PlaceItem) => void;
  onAddPlace: () => void;
  onDeletePlace: (id: string) => void;
  onDeletePlaces?: (ids: string[]) => void;
  onUpdatePlace?: (updatedPlace: PlaceItem) => void;
  onOpenUploadModal: () => void;
  externalCategoryFilter?: string;
}

interface DeleteConfirmState {
  ids: string[];
  title: string;
  description: string;
}

export const PlaceGrid: React.FC<PlaceGridProps> = ({
  places,
  selectedPlaceId,
  snapshotsMap,
  onSelectPlace,
  onAddPlace,
  onDeletePlace,
  onDeletePlaces,
  onUpdatePlace,
  onOpenUploadModal,
  externalCategoryFilter,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    area: '',
    city: '',
    country: '',
    category: '',
  });

  useEffect(() => {
    if (externalCategoryFilter !== undefined) {
      setFilters((prev) => ({ ...prev, category: externalCategoryFilter }));
    }
  }, [externalCategoryFilter]);

  const [editingCategoryPlaceId, setEditingCategoryPlaceId] = useState<string | null>(null);

  const [sortField, setSortField] = useState<keyof PlaceItem>('place_name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState | null>(null);

  // Extract unique Categories, Areas, Cities, Countries for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => {
      const cat = (p.category || 'Custom Location').trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [places]);

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

  // Helper for category badge styling
  const getCategoryBadgeStyle = (category?: string) => {
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

  // Filtered & Sorted Places
  const filteredPlaces = useMemo(() => {
    return places
      .filter((place) => {
        const query = filters.searchQuery.toLowerCase();
        const placeCat = (place.category || 'Custom Location').toLowerCase();
        const matchesQuery =
          !query ||
          place.place_name.toLowerCase().includes(query) ||
          place.area.toLowerCase().includes(query) ||
          place.street.toLowerCase().includes(query) ||
          place.city.toLowerCase().includes(query) ||
          place.country.toLowerCase().includes(query) ||
          place.description.toLowerCase().includes(query) ||
          placeCat.includes(query);

        const matchesCategory =
          !filters.category || (place.category || 'Custom Location').trim() === filters.category.trim();
        const matchesArea = !filters.area || place.area === filters.area;
        const matchesCity = !filters.city || place.city === filters.city;
        const matchesCountry = !filters.country || place.country === filters.country;

        return matchesQuery && matchesCategory && matchesArea && matchesCity && matchesCountry;
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
    setFilters({ searchQuery: '', area: '', city: '', country: '', category: '' });
  };

  // Selection handlers
  const isAllFilteredSelected = useMemo(() => {
    return filteredPlaces.length > 0 && filteredPlaces.every((p) => selectedIds.has(p.id));
  }, [filteredPlaces, selectedIds]);

  const isSomeFilteredSelected = useMemo(() => {
    return filteredPlaces.some((p) => selectedIds.has(p.id)) && !isAllFilteredSelected;
  }, [filteredPlaces, selectedIds, isAllFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredPlaces.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredPlaces.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const promptDeleteSingle = (place: PlaceItem) => {
    setDeleteConfirmState({
      ids: [place.id],
      title: 'Delete Location Record?',
      description: `Are you sure you want to remove "${place.place_name}"? This will delete the place and its associated snapshots from Firestore and local storage.`,
    });
  };

  const promptDeleteBulk = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setDeleteConfirmState({
      ids: idsToDelete,
      title: `Delete ${idsToDelete.length} Selected Locations?`,
      description: `Are you sure you want to remove ${idsToDelete.length} location records from the dataset? This action cannot be undone.`,
    });
  };

  const handleConfirmExecuteDelete = () => {
    if (!deleteConfirmState) return;

    const { ids } = deleteConfirmState;
    if (ids.length === 1) {
      onDeletePlace(ids[0]);
    } else if (ids.length > 1) {
      if (onDeletePlaces) {
        onDeletePlaces(ids);
      } else {
        ids.forEach((id) => onDeletePlace(id));
      }
    }

    // Remove deleted IDs from selected set
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    setDeleteConfirmState(null);
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
            {selectedIds.size > 0 && (
              <button
                onClick={promptDeleteBulk}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-sm transition-all animate-fadeIn"
                title={`Remove ${selectedIds.size} selected location(s)`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.size})
              </button>
            )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, street, category..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs pl-8 pr-3 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full bg-white text-slate-800 text-xs px-2.5 py-1.5 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700"
            >
              <option value="">All Categories ({uniqueCategories.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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

          {/* Country Filter & Clear */}
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

            {(filters.searchQuery || filters.category || filters.area || filters.city || filters.country) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold whitespace-nowrap transition-colors"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Category Chips */}
        {uniqueCategories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Categories:
            </span>
            <button
              onClick={() => setFilters({ ...filters, category: '' })}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                !filters.category
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({places.length})
            </button>
            {uniqueCategories.map((cat) => {
              const count = places.filter((p) => (p.category || 'Custom Location').trim() === cat).length;
              const isSelected = filters.category === cat;
              const badgeStyle = getCategoryBadgeStyle(cat);

              return (
                <button
                  key={cat}
                  onClick={() => setFilters({ ...filters, category: isSelected ? '' : cat })}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${badgeStyle} ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-1 font-black shadow-sm' : ''
                  }`}
                >
                  <span>{cat}</span>
                  <span className="opacity-70 text-[9px]">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* High Density Table */}
      <div className="overflow-x-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-300">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeFilteredSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  title={isAllFilteredSelected ? 'Deselect all filtered rows' : 'Select all filtered rows'}
                />
              </th>
              <th className="px-3 py-2 font-semibold w-12 text-center">Action</th>
              <th className="px-3 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('place_name')}>
                <div className="flex items-center gap-1">
                  <span>Place Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('area')}>
                <div className="flex items-center gap-1">
                  <span>Area</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3 py-2 font-semibold cursor-pointer hover:text-slate-800" onClick={() => handleSort('city')}>
                <div className="flex items-center gap-1">
                  <span>City/Country</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3 py-2 font-semibold">Coordinates</th>
              <th className="px-3 py-2 font-semibold">Snaps</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
            {filteredPlaces.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
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
                const isChecked = selectedIds.has(place.id);
                const snapCount = snapshotsMap[place.id] || 0;
                const categoryLabel = place.category || 'Custom Location';
                const badgeStyle = getCategoryBadgeStyle(categoryLabel);

                return (
                  <tr
                    key={place.id}
                    className={`transition-colors border-b border-slate-100 ${
                      isChecked
                        ? 'bg-amber-50/70'
                        : isSelected
                        ? 'bg-blue-50/60 font-medium border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50 cursor-default'
                    }`}
                  >
                    {/* Row Select Checkbox */}
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelectRow(place.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        title={isChecked ? 'Deselect row' : 'Select row'}
                      />
                    </td>

                    {/* Action button */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onSelectPlace(place)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold shadow-sm transition-all ${
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
                    <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">#{place.id}</td>

                    {/* Place Name */}
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      <div>
                        <span>{place.place_name}</span>
                        {place.street &&
                         place.street.trim().toLowerCase() !== 'main st' &&
                         place.street.trim().toLowerCase() !== 'n/a' &&
                         !place.place_name.toLowerCase().includes(place.street.toLowerCase()) &&
                         place.place_name.trim().toLowerCase() !== place.street.trim().toLowerCase() && (
                          <div className="text-[10px] text-slate-400 font-normal">{place.street}</div>
                        )}
                      </div>
                    </td>

                    {/* Category Badge & Inline Category Adjuster */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {editingCategoryPlaceId === place.id ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            autoFocus
                            value={place.category || 'Custom Location'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              setEditingCategoryPlaceId(null);
                              if (onUpdatePlace) {
                                onUpdatePlace({ ...place, category: newCat });
                              }
                            }}
                            className="bg-white text-slate-900 text-[11px] font-bold border-2 border-blue-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md cursor-pointer"
                          >
                            {STANDARD_PLACE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryPlaceId(null);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                            title="Cancel editing"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilters({ ...filters, category: categoryLabel });
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border transition-all ${badgeStyle}`}
                            title={`Filter table by category: ${categoryLabel}`}
                          >
                            <Tag className="w-2.5 h-2.5 opacity-70" />
                            <span>{categoryLabel}</span>
                          </button>
                          {onUpdatePlace && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategoryPlaceId(place.id);
                              }}
                              className="text-slate-500 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-1 rounded-md transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                              title="Click pencil to adjust/change category"
                            >
                              <Pencil className="w-3 h-3 text-slate-600 hover:text-blue-700" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Area */}
                    <td className="px-3 py-2 text-slate-600">{place.area || 'N/A'}</td>

                    {/* City / Country */}
                    <td className="px-3 py-2 text-slate-600">
                      {place.city && place.country && place.city.toLowerCase().includes(place.country.toLowerCase())
                        ? place.city
                        : `${place.city || ''}${place.city && place.country ? ', ' : ''}${place.country || ''}`}
                    </td>

                    {/* Coordinates */}
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                      {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                    </td>

                    {/* Snapshots Count */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                        <Layers className="w-3 h-3 text-blue-600" />
                        {snapCount}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={place.description}>
                      {place.description}
                    </td>

                    {/* Remove Action */}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => promptDeleteSingle(place)}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmState && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transform transition-all animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{deleteConfirmState.title}</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmState(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {deleteConfirmState.description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmState(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExecuteDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
