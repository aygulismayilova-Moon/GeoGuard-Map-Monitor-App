import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Siren,
  ShieldAlert,
  Car,
  Trees,
  Building,
  CloudRain,
  Wind,
  Cat,
  Flame,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  Bell,
  Activity,
  Filter,
} from 'lucide-react';
import { PlaceItem, AccidentType, AccidentEvent, IncidentAlarm } from '../types';
import { playAlarmBeep, startAlarmLoop, stopAlarmLoop } from '../utils/audioAlarm';

interface AccidentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: PlaceItem[];
  accidentEvents: AccidentEvent[];
  alarms: IncidentAlarm[];
  onAddAccidentEvent: (event: AccidentEvent) => void;
  onDeleteAccidentEvent: (id: string) => void;
  onAddAlarm: (alarm: IncidentAlarm) => void;
  onDeleteAlarm: (id: string) => void;
  onToggleAlarmMute: (id: string) => void;
  selectedPlace?: PlaceItem | null;
}

const ACCIDENT_CATEGORIES: { type: AccidentType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'Car Accident', label: 'Car Accident', icon: <Car className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { type: 'Nature Accident', label: 'Nature Accident', icon: <Flame className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { type: 'Tree Cutting', label: 'Tree Cutting', icon: <Trees className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { type: 'New Building Construction', label: 'New Construction', icon: <Building className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { type: 'Structural Damage', label: 'Structural Damage', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { type: 'Heavy Rain / Flood', label: 'Heavy Rain / Flood', icon: <CloudRain className="w-4 h-4" />, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { type: 'Severe Wind', label: 'Severe Wind', icon: <Wind className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { type: 'Animal Event', label: 'Animal Event', icon: <Cat className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { type: 'Other', label: 'Any Damage / Other', icon: <ShieldAlert className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const AccidentScannerModal: React.FC<AccidentScannerModalProps> = ({
  isOpen,
  onClose,
  places,
  accidentEvents,
  alarms,
  onAddAccidentEvent,
  onDeleteAccidentEvent,
  onAddAlarm,
  onDeleteAlarm,
  onToggleAlarmMute,
  selectedPlace,
}) => {
  const [activeTab, setActiveTab] = useState<'scanner' | 'alarms' | 'history'>('scanner');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedFocusPlaceId, setSelectedFocusPlaceId] = useState<string>('all');
  const [selectedAccidentTypes, setSelectedAccidentTypes] = useState<AccidentType[]>([
    'Car Accident',
    'Tree Cutting',
    'New Building Construction',
    'Heavy Rain / Flood',
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<string | null>(null);

  // New Alarm Form State
  const [alarmPlaceId, setAlarmPlaceId] = useState<string>('all');
  const [alarmAccidentType, setAlarmAccidentType] = useState<AccidentType | 'All'>('All');
  const [alarmSeverity, setAlarmSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');
  const [alarmLabel, setAlarmLabel] = useState<string>('City Safety Alarm');
  const [alarmSaveSuccess, setAlarmSaveSuccess] = useState<string | null>(null);
  const [isAlarmTesting, setIsAlarmTesting] = useState(false);

  // Incident Feed Filter State
  const [feedCityFilter, setFeedCityFilter] = useState<string>('All Cities');

  // Filter places for focus location select dropdown
  const filteredPlacesForFocus =
    selectedCity && selectedCity !== 'All Cities'
      ? places.filter((p) => p.city === selectedCity)
      : places;

  useEffect(() => {
    if (selectedPlace && isOpen) {
      setSelectedFocusPlaceId(selectedPlace.id);
      if (selectedPlace.city) {
        setSelectedCity(selectedPlace.city);
      }
    }
  }, [selectedPlace, isOpen]);

  const uniqueCities = useMemo(() => {
    const setOfCities = new Set<string>();
    places.forEach((p) => p.city && setOfCities.add(p.city));
    alarms.forEach((a) => a.cityName && a.cityName !== 'All Cities' && setOfCities.add(a.cityName));
    accidentEvents.forEach((e) => e.cityName && setOfCities.add(e.cityName));
    return Array.from(setOfCities);
  }, [places, alarms, accidentEvents]);

  // Filter incident feed by city
  const filteredFeedEvents = useMemo(() => {
    if (feedCityFilter === 'All Cities') {
      return accidentEvents;
    }
    return accidentEvents.filter(
      (e) => e.cityName?.toLowerCase() === feedCityFilter.toLowerCase()
    );
  }, [accidentEvents, feedCityFilter]);

  if (!isOpen) return null;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    if (city !== 'All Cities' && selectedFocusPlaceId !== 'all') {
      const currentPlace = places.find((p) => p.id === selectedFocusPlaceId);
      if (currentPlace && currentPlace.city !== city) {
        setSelectedFocusPlaceId('all');
      }
    }
  };

  const handleFocusPlaceChange = (placeId: string) => {
    setSelectedFocusPlaceId(placeId);
    if (placeId !== 'all') {
      const found = places.find((p) => p.id === placeId);
      if (found && found.city) {
        setSelectedCity(found.city);
      }
    }
  };

  const toggleCategorySelection = (type: AccidentType) => {
    if (selectedAccidentTypes.includes(type)) {
      setSelectedAccidentTypes(selectedAccidentTypes.filter((t) => t !== type));
    } else {
      setSelectedAccidentTypes([...selectedAccidentTypes, type]);
    }
  };

  const handleRunGemmaScan = async () => {
    setIsScanning(true);
    setScanSummary(null);

    // Target places to scan
    const targetPlacesToScan =
      selectedFocusPlaceId !== 'all'
        ? [places.find((p) => p.id === selectedFocusPlaceId) || places[0]]
        : selectedCity !== 'All Cities'
        ? places.filter((p) => p.city === selectedCity)
        : places.slice(0, 5); // Scan across multiple cities

    let totalDetected = 0;

    try {
      for (let i = 0; i < targetPlacesToScan.length; i++) {
        const targetPlace = targetPlacesToScan[i];
        const response = await fetch('/api/accidents/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName: targetPlace?.place_name || 'City Core',
            cityName: targetPlace?.city || selectedCity || 'Metropolitan Area',
            selectedTypes: selectedAccidentTypes,
          }),
        });

        const data = await response.json();

        if (data.detectedEvents && Array.isArray(data.detectedEvents)) {
          data.detectedEvents.forEach((ev: any, idx: number) => {
            totalDetected++;
            const newEvent: AccidentEvent = {
              id: `evt-${Date.now()}-${i}-${idx}`,
              placeId: targetPlace?.id || 'p-gen',
              placeName: targetPlace?.place_name || 'City Inspection Site',
              cityName: targetPlace?.city || 'City Zone',
              accidentType: ev.accidentType || 'Car Accident',
              severity: ev.severity || 'High',
              title: ev.title || 'City Incident Detected',
              description: ev.description || 'Gemma 4 identified geospatial variance in city.',
              timestamp: Date.now(),
              dateLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              locationCoordinates: {
                lat: targetPlace?.latitude || 37.7749,
                lng: targetPlace?.longitude || -122.4194,
              },
              status: ev.requiresAlarm ? 'Alarm Active' : 'Reported',
              alarmTriggered: ev.requiresAlarm,
            };
            onAddAccidentEvent(newEvent);

            if (ev.requiresAlarm) {
              playAlarmBeep();
            }
          });
        }
      }

      setScanSummary(`Gemma 4 scan complete across ${targetPlacesToScan.length} city site(s). ${totalDetected} incident event(s) recorded to Incident Feed.`);
    } catch (err) {
      console.error('Scan error:', err);
      setScanSummary('Failed to complete Gemma 4 scan. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPlace = places.find((p) => p.id === alarmPlaceId);

    const targetCityName =
      alarmPlaceId === 'all'
        ? selectedCity !== 'All Cities'
          ? selectedCity
          : 'All Cities'
        : targetPlace
        ? targetPlace.city
        : 'All Cities';

    const newAlarm: IncidentAlarm = {
      id: `alarm-${Date.now()}`,
      placeId: alarmPlaceId === 'all' ? undefined : alarmPlaceId,
      cityName: targetCityName,
      accidentType: alarmAccidentType,
      severityThreshold: alarmSeverity,
      isMuted: false,
      audioAlertEnabled: true,
      createdDate: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      label: alarmLabel.trim() || 'City Hazard Warning Alarm',
    };

    onAddAlarm(newAlarm);
    setAlarmLabel('City Safety Alarm');
    setAlarmSaveSuccess(`Alarm rule "${newAlarm.label}" saved successfully for ${newAlarm.cityName}!`);
    setTimeout(() => setAlarmSaveSuccess(null), 3500);
    playAlarmBeep();
  };

  const handleTestAlarmBeep = () => {
    setIsAlarmTesting(true);
    startAlarmLoop();
    setTimeout(() => {
      stopAlarmLoop();
      setIsAlarmTesting(false);
    }, 2000);
  };

  // Helper function to find if an incident triggers a specific alarm
  const getMatchingAlarm = (evt: AccidentEvent) => {
    return alarms.find(
      (a) =>
        (!a.isMuted) &&
        (a.cityName === 'All Cities' || a.cityName === evt.cityName) &&
        (a.accidentType === 'All' || a.accidentType === evt.accidentType)
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-5 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
              <Siren className="w-5 h-5 text-rose-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Gemma 4 Accident &amp; City Disaster Detector</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-600 text-white rounded">
                  AI &amp; ALARM ENGINE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Detect car accidents, nature events, tree cutting, building construction, heavy rain, wind, animal hazards, and configure automated alarms.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-base px-2">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'scanner' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Accident AI Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('alarms')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'alarms' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Set &amp; Manage Alarms ({alarms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Incident Feed ({accidentEvents.length})</span>
          </button>

          <button
            onClick={handleTestAlarmBeep}
            disabled={isAlarmTesting}
            className="ml-auto px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
            title="Test audio siren"
          >
            <Volume2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isAlarmTesting ? 'Siren Beeping...' : 'Test Siren'}</span>
          </button>
        </div>

        {/* TAB 1: ACCIDENT AI SCANNER */}
        {activeTab === 'scanner' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* City & Focus Location Selection Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Target City / Region</label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs p-2 rounded border border-slate-200 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="All Cities">All Cities / Regional Scope</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Focus Location / Place</label>
                <select
                  value={selectedFocusPlaceId}
                  onChange={(e) => handleFocusPlaceChange(e.target.value)}
                  className="w-full bg-white text-slate-800 text-xs p-2 rounded border border-slate-200 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Entire City / All Sites Grid</option>
                  {filteredPlacesForFocus.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.place_name} ({place.area ? `${place.area}, ` : ''}{place.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Selectors */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Select Accident &amp; Hazard Categories to Detect:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
                {ACCIDENT_CATEGORIES.map((cat) => {
                  const isSelected = selectedAccidentTypes.includes(cat.type);
                  return (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => toggleCategorySelection(cat.type)}
                      className={`p-2 rounded border text-left flex items-center gap-2 transition-all text-xs font-semibold ${
                        isSelected
                          ? `${cat.color} ring-1 ring-slate-400 font-bold`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat.icon}
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Run Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                {selectedAccidentTypes.length} Categories Selected
              </span>
              <button
                onClick={handleRunGemmaScan}
                disabled={isScanning || selectedAccidentTypes.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
                <span>{isScanning ? 'Gemma 4 Scanning Cities...' : 'Run Gemma 4 Accident Scan'}</span>
              </button>
            </div>

            {scanSummary && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 font-medium space-y-1">
                <div className="font-bold text-blue-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Gemma 4 Scan Summary
                </div>
                <p>{scanSummary}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SET ALARMS */}
        {activeTab === 'alarms' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Create New Alarm Form */}
            <form onSubmit={handleCreateAlarm} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Configure New Accident / Hazard Alarm</span>
                </div>
                {alarmSaveSuccess && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {alarmSaveSuccess}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Target Place / Scope</label>
                  <select
                    value={alarmPlaceId}
                    onChange={(e) => setAlarmPlaceId(e.target.value)}
                    className="w-full bg-white text-slate-800 p-1.5 rounded border border-slate-200 font-medium"
                  >
                    <option value="all">All Cities &amp; Monitored Places</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.place_name} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Accident Category</label>
                  <select
                    value={alarmAccidentType}
                    onChange={(e) => setAlarmAccidentType(e.target.value as any)}
                    className="w-full bg-white text-slate-800 p-1.5 rounded border border-slate-200 font-medium"
                  >
                    <option value="All">All Accident Types</option>
                    {ACCIDENT_CATEGORIES.map((c) => (
                      <option key={c.type} value={c.type}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Severity Threshold</label>
                  <select
                    value={alarmSeverity}
                    onChange={(e) => setAlarmSeverity(e.target.value as any)}
                    className="w-full bg-white text-slate-800 p-1.5 rounded border border-slate-200 font-medium"
                  >
                    <option value="Low">Low or Higher</option>
                    <option value="Medium">Medium or Higher</option>
                    <option value="High">High or Higher</option>
                    <option value="Critical">Critical Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Alarm Label</label>
                  <input
                    type="text"
                    required
                    value={alarmLabel}
                    onChange={(e) => setAlarmLabel(e.target.value)}
                    placeholder="e.g. SF Traffic & Flood Warning"
                    className="w-full bg-white text-slate-800 p-1.5 rounded border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm inline-flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Save Alarm Rule</span>
                </button>
              </div>
            </form>

            {/* Existing Alarms List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">Active Configured Alarms ({alarms.length})</h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Alarms monitor all saved city locations automatically
                </span>
              </div>

              {alarms.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 rounded border border-slate-200">
                  No active alarms configured. Use the form above to add an alarm rule.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-3 rounded border flex items-center justify-between text-xs transition-all ${
                        alarm.isMuted
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-white border-rose-200 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Siren className={`w-4 h-4 ${alarm.isMuted ? 'text-slate-400' : 'text-rose-600'}`} />
                          <span>{alarm.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 space-x-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-700">
                            📍 {alarm.cityName || 'All Cities'}
                          </span>
                          <span>Type: <strong>{alarm.accidentType}</strong></span>
                          <span>Severity: <strong>{alarm.severityThreshold}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleAlarmMute(alarm.id)}
                          className={`p-1.5 rounded border ${
                            alarm.isMuted
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                          title={alarm.isMuted ? 'Unmute Alarm' : 'Mute Alarm'}
                        >
                          {alarm.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => onDeleteAlarm(alarm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Alarm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INCIDENT FEED */}
        {activeTab === 'history' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {/* Filter Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Filter Feed by City / Saved Alarm:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFeedCityFilter('All Cities')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                    feedCityFilter === 'All Cities'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All Cities &amp; Saved Alarms ({accidentEvents.length})
                </button>

                {uniqueCities.map((city) => {
                  const cityEventsCount = accidentEvents.filter((e) => e.cityName?.toLowerCase() === city.toLowerCase()).length;
                  return (
                    <button
                      key={city}
                      onClick={() => setFeedCityFilter(city)}
                      className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                        feedCityFilter === city
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {city} ({cityEventsCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Incidents List */}
            {filteredFeedEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 text-center bg-slate-50 rounded border border-slate-200">
                No accident events found for <strong>{feedCityFilter}</strong>. Run a Gemma 4 scan or select "All Cities & Saved Alarms".
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredFeedEvents.map((evt) => {
                  const matchedAlarm = getMatchingAlarm(evt);

                  return (
                    <div
                      key={evt.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                        evt.status === 'Alarm Active' || evt.severity === 'Critical' || evt.severity === 'High'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-2 font-bold">
                          <span className="px-2 py-0.5 text-[10px] rounded font-extrabold bg-slate-900 text-white">
                            {evt.accidentType}
                          </span>
                          <span className="text-slate-900 font-extrabold text-sm">{evt.title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {evt.dateLabel}
                          </span>
                          <button
                            onClick={() => onDeleteAccidentEvent(evt.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-100 transition-colors"
                            title="Delete incident event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{evt.description}</p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-200/60 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {evt.cityName} — {evt.placeName}
                          </span>

                          {matchedAlarm && (
                            <span className="flex items-center gap-1 font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] shadow-2xs">
                              <Siren className="w-3 h-3 animate-pulse" />
                              Triggered Alarm: {matchedAlarm.label}
                            </span>
                          )}
                        </div>

                        <span className={`font-extrabold px-2 py-0.5 rounded ${
                          evt.severity === 'Critical' ? 'bg-rose-200 text-rose-900' :
                          evt.severity === 'High' ? 'bg-orange-100 text-orange-900' :
                          'bg-amber-100 text-amber-900'
                        }`}>
                          Severity: {evt.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
