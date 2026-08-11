import React, { useState, useMemo } from 'react';
import { PlaceItem, MapSnapshot } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  Camera,
  MapPin,
  TrendingUp,
  Building2,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface DashboardProps {
  places: PlaceItem[];
  snapshots: MapSnapshot[];
  snapshotsCountMap?: Record<string, number>;
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectCategoryFilter?: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Urban Construction': '#f59e0b',       // Amber
  'Coastal Monitoring': '#06b6d4',       // Cyan
  'Traffic & Infrastructure': '#3b82f6', // Blue
  'Forest & Vegetation': '#10b981',      // Emerald
  'Urban Development': '#8b5cf6',        // Purple
  'Public Infrastructure': '#6366f1',     // Indigo
  'Environmental Monitoring': '#059669',  // Dark Green
  'Industrial Site': '#64748b',          // Slate
  'Custom Location': '#ec4899',          // Pink
};

const DEFAULT_COLOR = '#94a3b8';

export const Dashboard: React.FC<DashboardProps> = ({
  places,
  snapshots,
  snapshotsCountMap = {},
  onSelectPlace,
  onSelectCategoryFilter,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'categoryBar' | 'categoryPie' | 'topPlaces'>('categoryBar');

  // Compute snapshot counts per place
  const computedSnapMap = useMemo(() => {
    if (Object.keys(snapshotsCountMap).length > 0) return snapshotsCountMap;
    const map: Record<string, number> = {};
    snapshots.forEach((s) => {
      map[s.placeId] = (map[s.placeId] || 0) + 1;
    });
    return map;
  }, [snapshots, snapshotsCountMap]);

  // Aggregate Category Data
  const categoryData = useMemo(() => {
    const stats: Record<
      string,
      { category: string; placeCount: number; totalSnapshots: number; placeNames: string[] }
    > = {};

    places.forEach((place) => {
      const cat = place.category || 'Custom Location';
      const snapCount = computedSnapMap[place.id] || 0;

      if (!stats[cat]) {
        stats[cat] = {
          category: cat,
          placeCount: 0,
          totalSnapshots: 0,
          placeNames: [],
        };
      }

      stats[cat].placeCount += 1;
      stats[cat].totalSnapshots += snapCount;
      stats[cat].placeNames.push(place.place_name);
    });

    return Object.values(stats).map((item) => ({
      ...item,
      avgSnapshots: item.placeCount > 0 ? parseFloat((item.totalSnapshots / item.placeCount).toFixed(1)) : 0,
      fill: CATEGORY_COLORS[item.category] || DEFAULT_COLOR,
    })).sort((a, b) => b.totalSnapshots - a.totalSnapshots || b.placeCount - a.placeCount);
  }, [places, computedSnapMap]);

  // Top 6 Monitored Places by Snapshot Count
  const topPlacesData = useMemo(() => {
    return [...places]
      .map((p) => ({
        id: p.id,
        name: p.place_name,
        area: p.area,
        category: p.category || 'Custom Location',
        snapshots: computedSnapMap[p.id] || 0,
        place: p,
      }))
      .sort((a, b) => b.snapshots - a.snapshots)
      .slice(0, 6);
  }, [places, computedSnapMap]);

  // General KPIs
  const totalPlaces = places.length;
  const totalSnapshots = snapshots.length;
  const avgSnapshotsPerPlace = totalPlaces > 0 ? (totalSnapshots / totalPlaces).toFixed(1) : '0';
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;

  // Custom Recharts Tooltip
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white text-xs rounded-lg p-3 shadow-xl border border-slate-700 space-y-1.5 z-50">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="font-bold text-slate-100">{data.category}</span>
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between gap-4">
              <span>Locations in Category:</span>
              <span className="font-bold text-white">{data.placeCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Total Snapshots Captured:</span>
              <span className="font-bold text-emerald-400">{data.totalSnapshots}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Avg Frequency / Location:</span>
              <span className="font-bold text-blue-400">{data.avgSnapshots}</span>
            </div>
          </div>
          {onSelectCategoryFilter && (
            <p className="text-[10px] text-amber-300 font-medium italic pt-1">
              Click bar/slice to filter dataset table
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shadow-2xs">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Geospatial Analytics Dashboard</h2>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                Recharts Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Distribution of monitored locations by category & snapshot capture frequency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-slate-500" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-slate-500" />
                <span>Expand Analytics</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-4 space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-md border border-blue-200">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Places</p>
                <p className="text-lg font-black text-slate-900">{totalPlaces}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Snapshots Captured</p>
                <p className="text-lg font-black text-slate-900">{totalSnapshots}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Avg Frequency</p>
                <p className="text-lg font-black text-slate-900">{avgSnapshotsPerPlace} <span className="text-xs font-normal text-slate-500">snaps/loc</span></p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-md border border-purple-200">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Top Category</p>
                <p className="text-xs font-black text-slate-900 truncate" title={topCategory?.category || 'N/A'}>
                  {topCategory?.category || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Chart Controls / View Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('categoryBar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'categoryBar'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Category vs Snapshots</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('categoryPie')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'categoryPie'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>Category Distribution</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('topPlaces')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                  activeTab === 'topPlaces'
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Top Monitored Places</span>
              </button>
            </div>

            {onSelectCategoryFilter && (
              <span className="text-[11px] text-slate-500 font-medium hidden md:flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Tip: Click chart bars to filter location grid</span>
              </span>
            )}
          </div>

          {/* Chart Display Area */}
          <div className="min-h-[300px] w-full pt-2">
            {/* View 1: Category Bar & Frequency Line Composed Chart */}
            {activeTab === 'categoryBar' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Category Volume & Snapshot Frequency Breakdown</span>
                  <span className="text-slate-400 text-[11px]">Bars: Places Count • Line: Snapshots Captured</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={categoryData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 25 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length && onSelectCategoryFilter) {
                          const cat = state.activePayload[0].payload.category;
                          onSelectCategoryFilter(cat);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#10b981' }} allowDecimals={false} />
                      <Tooltip content={<CustomCategoryTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" dataKey="placeCount" name="Monitored Locations" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="totalSnapshots"
                        name="Total Snapshots"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10b981' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View 2: Category Share Pie Chart */}
            {activeTab === 'categoryPie' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="h-[280px] w-full md:col-span-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="placeCount"
                        nameKey="category"
                        label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        labelLine={true}
                        onClick={(entry: any) => {
                          if (entry && entry.category && onSelectCategoryFilter) {
                            onSelectCategoryFilter(entry.category);
                          }
                        }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`pie-cell-${index}`}
                            fill={entry.fill}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomCategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend Summary */}
                <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>Category Breakdown</span>
                    <span className="text-[10px] text-slate-500 font-normal">{categoryData.length} active</span>
                  </h4>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {categoryData.map((cat) => (
                      <div
                        key={cat.category}
                        onClick={() => onSelectCategoryFilter && onSelectCategoryFilter(cat.category)}
                        className="flex items-center justify-between p-1 rounded hover:bg-slate-200/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.fill }} />
                          <span className="font-semibold text-slate-800 truncate">{cat.category}</span>
                        </div>
                        <span className="font-mono text-slate-600 bg-white border border-slate-200 px-1.5 rounded text-[10px]">
                          {cat.placeCount} locs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* View 3: Top 6 Monitored Places */}
            {activeTab === 'topPlaces' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Locations with Highest Snapshot Capture Volume</span>
                  <span className="text-slate-400 text-[11px]">Click a bar to inspect location on map</span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topPlacesData}
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length && onSelectPlace) {
                          const placeObj = state.activePayload[0].payload.place;
                          if (placeObj) onSelectPlace(placeObj);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        width={130}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${value} Snapshots`, 'Snapshot Volume']}
                        labelFormatter={(label: any) => `Location: ${label}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="snapshots" name="Snapshots Captured" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {topPlacesData.map((entry, index) => (
                          <Cell
                            key={`top-cell-${index}`}
                            fill={CATEGORY_COLORS[entry.category] || DEFAULT_COLOR}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
