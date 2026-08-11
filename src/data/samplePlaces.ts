import { PlaceItem } from '../types';

export const INITIAL_PLACES: PlaceItem[] = [
  {
    id: 'P001',
    place_name: 'Metropolitan Commercial Tower Site',
    area: 'Financial District',
    street: '750 Montgomery St',
    city: 'San Francisco',
    country: 'United States',
    latitude: 37.7952,
    longitude: -122.4028,
    description: 'Active urban commercial redevelopment lot near downtown core monitored for high-rise steel framing and excavator traffic.',
    category: 'Urban Construction',
  },
  {
    id: 'P002',
    place_name: 'Harbor Marina & Coastal Causeway',
    area: 'Biscayne Waterfront',
    street: '100 Biscayne Blvd',
    city: 'Miami',
    country: 'United States',
    latitude: 25.7743,
    longitude: -80.1856,
    description: 'Coastal causeway and marina dock monitored for coastal erosion, sea level shifts, and storm surge impact.',
    category: 'Coastal Monitoring',
  },
  {
    id: 'P003',
    place_name: 'Pine Creek Highway Interchange',
    area: 'North County Corridor',
    street: 'Mile Marker 42, Interstate 80',
    city: 'Denver',
    country: 'United States',
    latitude: 39.7392,
    longitude: -104.9903,
    description: 'High-density highway junction monitored for vehicular traffic flow, road pavement wear, and potential traffic accidents.',
    category: 'Traffic & Infrastructure',
  },
  {
    id: 'P004',
    place_name: 'Green Valley Forest Reserve - Sector 7',
    area: 'Cascadia Foothills',
    street: 'Timberline Logging Route 14',
    city: 'Seattle',
    country: 'United States',
    latitude: 47.6062,
    longitude: -122.3321,
    description: 'Protected woodland zone monitored for illegal tree cutting, logging expansion, and forest canopy loss.',
    category: 'Forest & Vegetation',
  },
  {
    id: 'P005',
    place_name: 'Brandenburg Innovation Park',
    area: 'Mitte District',
    street: 'Friedrichstraße 12',
    city: 'Berlin',
    country: 'Germany',
    latitude: 52.52,
    longitude: 13.405,
    description: 'Tech campus development zone monitored for infrastructure utility trenching and new facility construction.',
    category: 'Urban Development',
  },
  {
    id: 'P006',
    place_name: 'Marina Bay Promenade',
    area: 'Downtown Core',
    street: '10 Bayfront Ave',
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.2839,
    longitude: 103.858,
    description: 'High-visibility waterfront public space monitored for heavy pedestrian flow, pop-up structures, and maintenance.',
    category: 'Public Infrastructure',
  },
];

export const SAMPLE_CSV_TEXT = `id,place_name,area,street,city,country,latitude,longitude,description,category
P001,Metropolitan Commercial Tower Site,Financial District,750 Montgomery St,San Francisco,United States,37.7952,-122.4028,Active urban commercial redevelopment lot near downtown core monitored for high-rise steel framing.,Urban Construction
P002,Harbor Marina & Coastal Causeway,Biscayne Waterfront,100 Biscayne Blvd,Miami,United States,25.7743,-80.1856,Coastal causeway and marina dock monitored for coastal erosion and sea level shifts.,Coastal Monitoring
P003,Pine Creek Highway Interchange,North County Corridor,Mile Marker 42 Interstate 80,Denver,United States,39.7392,-104.9903,High-density highway junction monitored for traffic flow and accidents.,Traffic & Infrastructure
P004,Green Valley Forest Reserve Sector 7,Cascadia Foothills,Timberline Logging Route 14,Seattle,United States,47.6062,-122.3321,Protected woodland zone monitored for illegal tree cutting and canopy loss.,Forest & Vegetation
P005,Brandenburg Innovation Park,Mitte District,Friedrichstraße 12,Berlin,Germany,52.5200,13.4050,Tech campus development zone monitored for infrastructure utility trenching.,Urban Development
P006,Marina Bay Promenade,Downtown Core,10 Bayfront Ave,Singapore,Singapore,1.2839,103.8580,High-visibility waterfront public space monitored for pop-up structures.,Public Infrastructure`;
