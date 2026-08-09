import React, { useState } from 'react';
import { PlaceItem } from '../types';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { SAMPLE_CSV_TEXT } from '../data/samplePlaces';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (newPlaces: PlaceItem[]) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onDatasetLoaded }) => {
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<PlaceItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Process uploaded CSV file or text
  const parseCsvData = (text: string) => {
    setErrorMsg(null);
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setErrorMsg(`CSV Parsing Warning: ${results.errors[0].message}`);
        }

        const items: PlaceItem[] = [];
        results.data.forEach((row: any, index: number) => {
          if (!row.place_name && !row.id) return;

          const lat = parseFloat(row.latitude) || 37.7749;
          const lng = parseFloat(row.longitude) || -122.4194;

          items.push({
            id: row.id ? String(row.id) : `P${String(index + 1).padStart(3, '0')}`,
            place_name: row.place_name || `Location ${index + 1}`,
            area: row.area || 'General Area',
            street: row.street || 'Main St',
            city: row.city || 'San Francisco',
            country: row.country || 'United States',
            latitude: lat,
            longitude: lng,
            description: row.description || 'Monitored location from CSV upload.',
            category: row.category || 'Uploaded Places',
          });
        });

        if (items.length === 0) {
          setErrorMsg('No valid rows found in CSV. Please verify header columns: id, place_name, area, street, city, country, latitude, longitude, description');
        } else {
          setParsedPreview(items);
        }
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
      parseCsvData(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    setCsvRawText(SAMPLE_CSV_TEXT);
    parseCsvData(SAMPLE_CSV_TEXT);
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
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-5 shadow-2xl space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Places Dataset CSV</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Required columns: <code>id, place_name, area, street, city, country, latitude, longitude, description</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Upload Zone */}
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-lg p-5 text-center bg-slate-50 transition-colors">
            <Upload className="w-7 h-7 text-blue-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-800">Drag and drop your CSV dataset file here</p>
            <p className="text-[11px] text-slate-500">Or click below to browse files from your computer</p>

            <div className="mt-3 flex items-center justify-center gap-2">
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
              rows={4}
              placeholder="id,place_name,area,street,city,country,latitude,longitude,description..."
              value={csvRawText}
              onChange={(e) => {
                setCsvRawText(e.target.value);
                parseCsvData(e.target.value);
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
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Parsed {parsedPreview.length} places successfully
              </span>
              <span className="text-slate-500 text-[11px]">Previewing first 3 rows:</span>
            </div>

            <div className="overflow-x-auto max-h-36 border border-slate-200 rounded bg-slate-50">
              <table className="w-full text-left text-[11px] text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">Place Name</th>
                    <th className="p-2">Area</th>
                    <th className="p-2">City</th>
                    <th className="p-2">Country</th>
                    <th className="p-2">Lat, Lng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {parsedPreview.slice(0, 3).map((p, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono text-slate-400">{p.id}</td>
                      <td className="p-2 font-semibold text-slate-900">{p.place_name}</td>
                      <td className="p-2">{p.area}</td>
                      <td className="p-2">{p.city}</td>
                      <td className="p-2">{p.country}</td>
                      <td className="p-2 font-mono text-blue-700">
                        {p.latitude}, {p.longitude}
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
