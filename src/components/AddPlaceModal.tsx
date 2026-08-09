import React, { useState } from 'react';
import { PlaceItem } from '../types';
import { MapPin, Plus } from 'lucide-react';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlace: (newPlace: PlaceItem) => void;
}

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({ isOpen, onClose, onAddPlace }) => {
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.place_name) return;

    const newPlace: PlaceItem = {
      id: `P${Math.floor(100 + Math.random() * 900)}`,
      place_name: formData.place_name,
      area: formData.area || 'General Area',
      street: formData.street || 'Main St',
      city: formData.city || 'San Francisco',
      country: formData.country || 'United States',
      latitude: parseFloat(formData.latitude) || 37.7749,
      longitude: parseFloat(formData.longitude) || -122.4194,
      description: formData.description || 'Monitored location.',
      category: formData.category,
    };

    onAddPlace(newPlace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Add New Place to Dataset</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1 text-[11px]">Place Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Downtown Central Plaza Site"
              value={formData.place_name}
              onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Area / District</label>
              <input
                type="text"
                placeholder="e.g. Financial District"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Street Address</label>
              <input
                type="text"
                placeholder="e.g. 100 Main St"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
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
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Country</label>
              <input
                type="text"
                placeholder="e.g. United States"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full bg-slate-50 text-slate-800 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-[11px]">Description</label>
            <textarea
              rows={2}
              placeholder="Key monitoring points, purpose..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 text-slate-800 p-2.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm"
            >
              Add Place to Dataset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
