export const STANDARD_PLACE_CATEGORIES = [
  'Urban Construction',
  'Coastal Monitoring',
  'Traffic & Infrastructure',
  'Forest & Vegetation',
  'Urban Development',
  'Public Infrastructure',
  'Environmental Monitoring',
  'Industrial Site',
  'Custom Location',
] as const;

export interface PlaceItem {
  id: string;
  place_name: string;
  area: string;
  street: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string;
  category?: string;
}

export interface MapSnapshot {
  id: string;
  placeId: string;
  capturedAt: string; // ISO string or timestamp
  dateLabel: string;  // e.g. "Aug 9, 2026 - 10:15 AM"
  isoDate: string;    // e.g. "2026-08-09"
  imageUrl: string;   // base64 data URL
  zoomLevel: number;
  mapType: 'satellite' | 'roadmap' | 'hybrid' | 'terrain';
  notes?: string;
  lat: number;
  lng: number;
  eventOverlay?: string; // Optional tag if generated with simulated event
}

export interface ChangeAnalysisResult {
  changeDetected: boolean;
  changeType: 'Building Construction' | 'Car Accident' | 'Nature Event' | 'Tree Cutting' | 'Infrastructure Work' | 'Landscaping' | 'No Significant Change' | string;
  confidenceScore: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | 'None' | string;
  summary: string;
  detailedAnalysis: string;
  changedAreas: string[];
  actionableRecommendations: string[];
}

export type AccidentType =
  | 'Car Accident'
  | 'Nature Accident'
  | 'Tree Cutting'
  | 'New Building Construction'
  | 'Structural Damage'
  | 'Heavy Rain / Flood'
  | 'Severe Wind'
  | 'Animal Event'
  | 'Other';

export interface AccidentEvent {
  id: string;
  placeId: string;
  placeName: string;
  cityName: string;
  accidentType: AccidentType;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  description: string;
  timestamp: number;
  dateLabel: string;
  locationCoordinates: { lat: number; lng: number };
  status: 'Reported' | 'Verified' | 'Resolved' | 'Alarm Active';
  alarmTriggered?: boolean;
  imageUrl?: string;
}

export interface IncidentAlarm {
  id: string;
  placeId?: string;
  cityName?: string;
  accidentType: AccidentType | 'All';
  severityThreshold: 'Low' | 'Medium' | 'High' | 'Critical';
  isMuted: boolean;
  audioAlertEnabled: boolean;
  createdDate: string;
  lastTriggered?: string;
  label: string;
}

export interface HeatmapPoint {
  id: string;
  xPercent: number;
  yPercent: number;
  lat: number;
  lng: number;
  intensity: number;
  radiusMeters: number;
  changeType: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface HeatmapOverlayResult {
  placeId: string;
  snapshotAId: string;
  snapshotBId: string;
  snapshotADate: string;
  snapshotBDate: string;
  generatedAt: string;
  overallSummary: string;
  changeDetected: boolean;
  maxIntensity: number;
  points: HeatmapPoint[];
}

export interface FilterState {
  searchQuery: string;
  area: string;
  city: string;
  country: string;
  category: string;
}

