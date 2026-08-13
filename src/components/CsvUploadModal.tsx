import React, { useState } from 'react';
import { PlaceItem } from '../types';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, Tag, RefreshCw, Layers } from 'lucide-react';
import { SAMPLE_CSV_TEXT } from '../data/samplePlaces';

export const PRESET_CATEGORIES = [
  'Urban Construction',
  'Coastal Monitoring',
  'Traffic & Infrastructure',
  'Forest & Vegetation',
  'Urban Development',
  'Public Infrastructure',
  'Environmental Monitoring',
  'Industrial Site',
  'Custom Location',
];

// Helper to auto-classify categories based on place text content
export const detectPlaceCategory = (
  rawCat: string = '',
  placeName: string = '',
  description: string = '',
  area: string = '',
  street: string = ''
): string => {
  const trimmed = rawCat.trim();
  if (
    trimmed !== '' &&
    trimmed.toLowerCase() !== 'uploaded places' &&
    trimmed.toLowerCase() !== 'custom location' &&
    trimmed.toLowerCase() !== 'general' &&
    trimmed.toLowerCase() !== 'n/a'
  ) {
    return trimmed;
  }

  const text = `${placeName} ${description} ${area} ${street}`.toLowerCase();

  if (/construction|tower|building|redevelopment|framing|steel|lot|excavator|renovation|crane|site|architect/i.test(text)) {
    return 'Urban Construction';
  }
  if (/coastal|marina|dock|erosion|causeway|harbor|port|bay|ocean|sea|beach|waterfront|coast|shore|flood|tsunami|reef/i.test(text)) {
    return 'Coastal Monitoring';
  }
  if (/traffic|highway|interchange|interstate|bridge|freeway|road|junction|pavement|vehicular|corridor|tunnel|transit|rail/i.test(text)) {
    return 'Traffic & Infrastructure';
  }
  if (/forest|woodland|logging|tree|canopy|reserve|foothill|timber|park|vegetation|jungle|wilderness|wildlife/i.test(text)) {
    return 'Forest & Vegetation';
  }
  if (/park|development|campus|district|innovation|zone|urban|residential|suburb|housing|neighborhood/i.test(text)) {
    return 'Urban Development';
  }
  if (/promenade|public|facility|stadium|station|airport|utility|trenching|pedestrian|plaza|civic/i.test(text)) {
    return 'Public Infrastructure';
  }
  if (/environmental|mining|refinery|spill|pollution|emissions|river|lake|reservoir|solar|wind/i.test(text)) {
    return 'Environmental Monitoring';
  }
  if (/industrial|factory|plant|warehouse|depot|logistics|manufacturing/i.test(text)) {
    return 'Industrial Site';
  }

  return 'Custom Location';
};

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (newPlaces: PlaceItem[]) => void;
  existingPlaces?: PlaceItem[];
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
  existingPlaces = [],
}) => {
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<PlaceItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [batchCategoryMode, setBatchCategoryMode] = useState<string>('auto');

  if (!isOpen) return null;

  // Process uploaded CSV file or text with strict deduplication on name and lat/lng
  const parseCsvData = (text: string, categoryOverride: string = batchCategoryMode) => {
    setErrorMsg(null);
    setDuplicateCount(0);

    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header: string) =>
        header
          .trim()
          .toLowerCase()
          .replace(/[\s_-]+/g, '_'),
      complete: (results) => {
        const items: PlaceItem[] = [];
        let skippedDups = 0;

        if (!results.data || !Array.isArray(results.data)) {
          setErrorMsg('Unable to parse CSV file. Please check file formatting.');
          return;
        }

        results.data.forEach((row: any, index: number) => {
          if (!row || typeof row !== 'object') return;

          // Helper to get row value across various possible normalized key names
          const getValue = (...keys: string[]) => {
            for (const key of keys) {
              if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const rawPlaceName = getValue(
            'place_name',
            'placename',
            'place',
            'name',
            'title',
            'location_name',
            'location',
            'site_name',
            'site',
            'facility',
            'station',
            'point',
            'landmark',
            'venue',
            'label',
            'item'
          );
          const rawStreet = getValue('street', 'street_address', 'address', 'location_street', 'addr', 'road', 'avenue');
          const rawArea = getValue('area', 'zone', 'district', 'neighborhood', 'region', 'sector') || 'General Area';
          const rawCity = getValue('city', 'city_name', 'town', 'municipality');
          const rawCountry = getValue('country', 'country_name', 'state', 'nation');
          const rawCategory = getValue('category', 'cat', 'type', 'class', 'group', 'tag');
          const baseDesc =
            getValue('description', 'desc', 'details', 'notes', 'info', 'remarks', 'comment', 'summary') ||
            'Monitored location from CSV dataset upload.';
          const rawId = getValue('id', 'place_id', 'code', 'no', 'num', 'number');

          // Check if row has any text value
          const rowValues = Object.values(row).map((v) => String(v || '').trim()).filter((v) => v !== '');
          if (rowValues.length === 0) return; // Completely empty row

          // Fallback name if place_name wasn't explicitly named
          const fallbackName =
            rawPlaceName ||
            rawStreet ||
            rawCity ||
            rawArea ||
            rowValues[0] ||
            `Location ${index + 1}`;

          // 1. Clean Country and City (ensure country is stored strictly in country field, not concatenated into city)
          let cleanCountry = rawCountry.trim();
          let cleanCity = rawCity.trim();

          // Strip street from city if present
          if (cleanCity && rawStreet) {
            const streetRegex = new RegExp(rawStreet.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
            cleanCity = cleanCity.replace(streetRegex, '').replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
          }

          // Strip country from city if country is embedded inside city value (e.g. "San Francisco, United States" -> "San Francisco")
          if (cleanCity && cleanCountry) {
            const countryRegex = new RegExp(`\\b${cleanCountry.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'gi');
            cleanCity = cleanCity.replace(countryRegex, '').replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
          }

          if (!cleanCity) {
            cleanCity = rawArea ? rawArea : 'San Francisco';
          }
          if (!cleanCountry) {
            cleanCountry = 'United States';
          }

          // 2. Clean Street and Place Name (avoid street appearing twice)
          let cleanStreet = rawStreet.trim();
          let cleanPlaceName = rawPlaceName.trim();

          // If rawPlaceName contains street address, strip street from place_name to keep place_name concise
          if (cleanPlaceName && cleanStreet) {
            if (cleanPlaceName.toLowerCase().includes(cleanStreet.toLowerCase()) && cleanPlaceName.toLowerCase() !== cleanStreet.toLowerCase()) {
              const streetRegex = new RegExp(cleanStreet.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
              const stripped = cleanPlaceName.replace(streetRegex, '').replace(/^[\s,:-]+|[\s,:-]+$/g, '').trim();
              if (stripped.length >= 2) {
                cleanPlaceName = stripped;
              }
            }
          }

          // Fallback place_name if empty
          if (!cleanPlaceName) {
            if (rawArea && rawArea !== 'General Area') {
              cleanPlaceName = `${rawArea} Site`;
            } else if (cleanStreet) {
              cleanPlaceName = cleanStreet;
            } else {
              cleanPlaceName = `Location ${index + 1}`;
            }
          }

          if (!cleanStreet) {
            cleanStreet = 'Main St';
          }

          // 3. Combine / parse latitude with longitude
          let lat = 37.7749;
          let lng = -122.4194;
          let hasExplicitCoords = false;

          const rawLat = getValue('latitude', 'lat', 'y', 'lat_deg', 'lat_decimal');
          const rawLng = getValue('longitude', 'lng', 'long', 'x', 'lng_deg', 'lon', 'long_decimal');

          if (rawLat && !isNaN(parseFloat(rawLat))) {
            lat = parseFloat(rawLat);
            hasExplicitCoords = true;
          }
          if (rawLng && !isNaN(parseFloat(rawLng))) {
            lng = parseFloat(rawLng);
            hasExplicitCoords = true;
          }

          const combinedCoordsCol = getValue(
            'latitude_longitude',
            'lat_lng',
            'lat_long',
            'coordinates',
            'location_coords',
            'coords'
          );

          if (combinedCoordsCol) {
            const parts = combinedCoordsCol
              .split(/[,/;\s]+/)
              .map((p) => parseFloat(p.trim()))
              .filter((n) => !isNaN(n));
            if (parts.length >= 2) {
              lat = parts[0];
              lng = parts[1];
              hasExplicitCoords = true;
            }
          }

          // If coordinates were missing or defaulted, add small spatial offset per row
          if (!hasExplicitCoords) {
            const colIndex = index % 10;
            const rowIndex = Math.floor(index / 10);
            lat = 37.7749 + rowIndex * 0.005 + (colIndex % 2 === 0 ? 0.002 : -0.002);
            lng = -122.4194 + colIndex * 0.005 + (rowIndex % 2 === 0 ? 0.002 : -0.002);
          }

          // Handle duplicate names in the same upload batch by appending index
          let cleanName = cleanPlaceName;
          const sameNameCount = items.filter(
            (p) => p.place_name.trim().toLowerCase().startsWith(cleanName.toLowerCase())
          ).length;

          if (sameNameCount > 0) {
            cleanName = `${cleanPlaceName} (#${sameNameCount + 1})`;
          }

          // Determine final Category assignment based on user selection or smart keyword classification
          const finalCategory =
            categoryOverride === 'auto'
              ? detectPlaceCategory(rawCategory, cleanName, baseDesc, rawArea, cleanStreet)
              : categoryOverride;

          items.push({
            id: rawId ? String(rawId) : `P${String(index + 1).padStart(3, '0')}`,
            place_name: cleanName,
            area: rawArea,
            street: cleanStreet,
            city: cleanCity,
            country: cleanCountry,
            latitude: lat,
            longitude: lng,
            description: baseDesc,
            category: finalCategory,
          });
        });

        setDuplicateCount(skippedDups);

        if (items.length === 0) {
          if (skippedDups > 0) {
            setErrorMsg(`All ${skippedDups} row(s) in CSV were identified as duplicate names or coordinates and skipped.`);
          } else {
            setErrorMsg('No valid place rows found in CSV. Supports standard CSV files with place_name, latitude, longitude, and category columns.');
          }
        } else {
          setParsedPreview(items);
        }
      },
    });
  };

  const handleBatchCategoryChange = (newMode: string) => {
    setBatchCategoryMode(newMode);
    if (parsedPreview.length > 0) {
      const updated = parsedPreview.map((item) => ({
        ...item,
        category:
          newMode === 'auto'
            ? detectPlaceCategory('', item.place_name, item.description, item.area, item.street)
            : newMode,
      }));
      setParsedPreview(updated);
    } else if (csvRawText) {
      parseCsvData(csvRawText, newMode);
    }
  };

  const handleRowCategoryChange = (index: number, newCat: string) => {
    const updated = [...parsedPreview];
    if (updated[index]) {
      updated[index] = { ...updated[index], category: newCat };
      setParsedPreview(updated);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
      parseCsvData(text, batchCategoryMode);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    setCsvRawText(SAMPLE_CSV_TEXT);
    parseCsvData(SAMPLE_CSV_TEXT, batchCategoryMode);
  };

  const handleConfirmDataset = () => {
    if (parsedPreview.length > 0) {
      onDatasetLoaded(parsedPreview);
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_TEXT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'geoguard_places_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-5 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Places Dataset CSV</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Required columns: <code>id, place_name, area, street, city, country, latitude, longitude, description, category</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Batch Category Adjustment Toolbar */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <label className="text-xs font-bold text-blue-900">
                Adjust Categories for Uploaded Places:
              </label>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={batchCategoryMode}
                onChange={(e) => handleBatchCategoryChange(e.target.value)}
                className="bg-white text-slate-800 text-xs font-semibold rounded border border-blue-300 px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">✨ Auto-Detect Categories (Keyword Classification)</option>
                {PRESET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleBatchCategoryChange('auto')}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                title="Re-run intelligent category classification"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto-Detect</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-blue-800 font-medium">
            Category classification automatically assigns domain types (e.g., Coastal, Urban Construction, Traffic) based on place names and descriptions.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-lg p-4 text-center bg-slate-50 transition-colors">
            <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-800">Drag and drop your CSV dataset file here</p>
            <p className="text-[11px] text-slate-500">Or click below to browse files from your computer</p>

            <div className="mt-2.5 flex items-center justify-center gap-2">
              <label className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer shadow-sm transition-colors">
                Select CSV File
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                onClick={handleLoadSampleCsv}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              >
                Load Sample Template
              </button>

              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors inline-flex items-center gap-1"
                title="Download standard CSV template file"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Download Template
              </button>
            </div>
          </div>

          {/* Or Paste Raw CSV text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Or Paste CSV Text Directly:
            </label>
            <textarea
              rows={3}
              placeholder="id,place_name,area,street,city,country,latitude,longitude,description,category..."
              value={csvRawText}
              onChange={(e) => {
                setCsvRawText(e.target.value);
                parseCsvData(e.target.value, batchCategoryMode);
              }}
              className="w-full bg-slate-50 text-slate-800 font-mono text-[11px] p-2.5 rounded border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedPreview.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Parsed {parsedPreview.length} place(s)
                </span>
                <span className="bg-blue-50 text-blue-800 border border-blue-200 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                  ✨ Auto-assigned Categories
                </span>
                {duplicateCount > 0 && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    Skipped {duplicateCount} duplicate(s)
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-[11px]">Previewing all places (adjust categories per row if needed):</span>
            </div>

            <div className="overflow-x-auto max-h-48 border border-slate-200 rounded bg-slate-50">
              <table className="w-full text-left text-[11px] text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">Place Name</th>
                    <th className="p-2">Category (Adjust)</th>
                    <th className="p-2">Area / City</th>
                    <th className="p-2">Lat, Lng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {parsedPreview.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-400">{p.id}</td>
                      <td className="p-2 font-semibold text-slate-900">{p.place_name}</td>
                      <td className="p-2">
                        <select
                          value={p.category || 'Custom Location'}
                          onChange={(e) => handleRowCategoryChange(idx, e.target.value)}
                          className="bg-slate-50 text-slate-900 text-[11px] font-bold border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {PRESET_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-slate-600">{p.area || p.city}</td>
                      <td className="p-2 font-mono text-blue-700">
                        {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-200">
            Cancel
          </button>
          <button
            onClick={handleConfirmDataset}
            disabled={parsedPreview.length === 0}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50"
          >
            Load Dataset into Grid ({parsedPreview.length} Places)
          </button>
        </div>
      </div>
    </div>
  );
};
