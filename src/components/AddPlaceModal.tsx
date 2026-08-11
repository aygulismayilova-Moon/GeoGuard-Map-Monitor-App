import React, { useState, useMemo } from 'react';
import { PlaceItem } from '../types';
import { MapPin, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlace: (newPlace: PlaceItem) => void;
  existingPlaces?: PlaceItem[];
}

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  isOpen,
  onClose,
  onAddPlace,
  existingPlaces = [],
}) => {
  const [formData, setFormData] = useState({
    place_name: '',
    area: '',
    street: '',
    city: '',
    country: '',
    latitude: '37.7749',
    longitude: '-122.4194',
    description: '',
    category: 'Custom Location',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute if current name or coordinates match existing places
  const nameDuplicateMatch = useMemo(() => {
    if (!formData.place_name.trim()) return null;
    const cleanName = formData.place_name.trim().toLowerCase();
    return existingPlaces.find((p) => p.place_name.trim().toLowerCase() === cleanName) || null;
  }, [formData.place_name, existingPlaces]);

  const coordsDuplicateMatch = useMemo(() => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;

    return (
      existingPlaces.find(
        (p) => Math.abs(p.latitude - lat) < 0.0001 && Math.abs(p.longitude - lng) < 0.0001
      ) || null
    );
  }, [formData.latitude, formData.longitude, existingPlaces]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = formData.place_name.trim();
    if (!trimmedName) {
      setValidationError('Please enter a place name.');
      return;
    }

    // Check duplicate name
    if (nameDuplicateMatch) {
      setValidationError(
        `Duplicate Name Error: A location named "${nameDuplicateMatch.place_name}" already exists in the dataset (#${nameDuplicateMatch.id}).`
      );
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setValidationError('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setValidationError('Longitude must be a valid number between -180 and 180.');
      return;
    }

    // Check duplicate coordinates
    if (coordsDuplicateMatch) {
      setValidationError(
        `Duplicate Coordinates Error: A location at coordinates (${coordsDuplicateMatch.latitude.toFixed(
          4
        )}, ${coordsDuplicateMatch.longitude.toFixed(4)}) already exists ("${
          coordsDuplicateMatch.place_name
        }").`
      );
      return;
    }

    const newPlace: PlaceItem = {
      id: `P${Math.floor(100 + Math.random() * 900)}`,
      place_name: trimmedName,
      area: formData.area.trim() || 'General Area',
      street: formData.street.trim() || 'Main St',
      city: formData.city.trim() || 'San Francisco',
      country: formData.country.trim() || 'United States',
      latitude: lat,
      longitude: lng,
      description: formData.description.trim() || 'Monitored location.',
      category: formData.category,
    };

    onAddPlace(newPlace);
    setValidationError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add New Place to Dataset</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Unique place name &amp; coordinates (Lat/Lng) are enforced.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 font-medium animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block">Validation Check Failed</strong>
              <span>{validationError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Place Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-800 font-bold text-[11px]">
                Place Name <span className="text-rose-500">*</span>
              </label>
              {nameDuplicateMatch && (
                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Duplicate Name
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Downtown Central Plaza Site"
              value={formData.place_name}
              onChange={(e) => {
                setFormData({ ...formData, place_name: e.target.value });
                if (validationError) setValidationError(null);
              }}
              className={`w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-lg border font-medium focus:outline-none transition-colors ${
                nameDuplicateMatch
                  ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600 focus:bg-white'
                  : 'border-slate-200 focus:border-blue-500 focus:bg-white'
              }`}
            />
            {nameDuplicateMatch && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                ⚠️ "{nameDuplicateMatch.place_name}" already exists in dataset!
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
              >
                <option value="Construction">Construction</option>
                <option value="Environmental">Environmental</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Coastal Monitoring">Coastal Monitoring</option>
                <option value="Urban Development">Urban Development</option>
                <option value="Public Infrastructure">Public Infrastructure</option>
                <option value="Forest & Vegetation">Forest & Vegetation</option>
                <option value="Custom Location">Custom Location</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Area / District</label>
              <input
                type="text"
                placeholder="e.g. Financial District"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">City</label>
              <input
                type="text"
                placeholder="e.g. San Francisco"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Country</label>
              <input
                type="text"
                placeholder="e.g. United States"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          {/* Coordinates section with Lat/Lng duplicate check */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-slate-700">Geospatial Coordinates</span>
              {coordsDuplicateMatch && (
                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Duplicate Lat/Lng
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Latitude (-90 to 90)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => {
                    setFormData({ ...formData, latitude: e.target.value });
                    if (validationError) setValidationError(null);
                  }}
                  className={`w-full bg-white text-slate-800 px-2.5 py-1.5 rounded-lg border font-mono font-medium focus:outline-none ${
                    coordsDuplicateMatch ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">Longitude (-180 to 180)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => {
                    setFormData({ ...formData, longitude: e.target.value });
                    if (validationError) setValidationError(null);
                  }}
                  className={`w-full bg-white text-slate-800 px-2.5 py-1.5 rounded-lg border font-mono font-medium focus:outline-none ${
                    coordsDuplicateMatch ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {coordsDuplicateMatch && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                ⚠️ Coordinates match "{coordsDuplicateMatch.place_name}" ({coordsDuplicateMatch.latitude}, {coordsDuplicateMatch.longitude})
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-[11px]">Description</label>
            <textarea
              rows={2}
              placeholder="Key monitoring points, purpose..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!nameDuplicateMatch || !!coordsDuplicateMatch}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Place to Dataset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

