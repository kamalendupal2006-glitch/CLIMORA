import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useSearchParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { HOTSPOTS, RISK_LEVELS, RECOMMENDED_ACTIONS } from '../data/mockData';
import RiskBadge from '../components/RiskBadge';
import { getReports } from '../services/communityReportService';
import {
  MapPin,
  Compass,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  CloudRain,
  Droplets,
  Mountain,
  Thermometer,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';

function createCustomMarkerIcon(level = 'LOW', isSelected = false) {
  const config = RISK_LEVELS[level] || RISK_LEVELS.LOW;
  const pulseClass = `pulse-ring-${level.toLowerCase()}`;
  const size = isSelected ? 38 : 28;
  const anchor = size / 2;

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer">
        <div class="absolute w-10 h-10 rounded-full ${pulseClass}"></div>
        <div class="relative w-6 h-6 rounded-full border-2 ${
          isSelected ? 'border-white ring-4 ring-emerald-400/80 scale-125' : 'border-white'
        } shadow-2xl flex items-center justify-center transition-transform duration-200" style="background-color: ${config.hex};">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  });
}

function createReportMarkerIcon(incidentType, verificationStatus, severity, isSelected = false) {
  const isVerified = verificationStatus === 'VERIFIED';
  const isResolved = verificationStatus === 'RESOLVED';
  
  let bgHex = '#f59e0b'; // Amber for unverified
  if (isResolved) bgHex = '#64748b';
  else if (isVerified) bgHex = '#10b981'; // Emerald for verified
  else if (severity === 'CRITICAL') bgHex = '#ef4444'; // Red for critical

  const size = isSelected ? 34 : 26;
  const anchor = size / 2;
  const badgeBorder = isVerified ? 'border-emerald-300 ring-2 ring-emerald-400' : 'border-amber-300 ring-2 ring-amber-400/60';

  return L.divIcon({
    className: 'custom-report-icon',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer">
        <div class="relative w-6 h-6 rounded-full ${badgeBorder} shadow-2xl flex items-center justify-center text-white text-[10px] font-bold" style="background-color: ${bgHex};">
          !
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  });
}

function MapController({ coords, zoom = 10 }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length === 2) {
      map.flyTo(coords, zoom, { duration: 1.2 });
    }
  }, [coords, map, zoom]);
  return null;
}

export default function RiskMap() {
  const [searchParams] = useSearchParams();
  const queryLat = searchParams.get('lat');
  const queryLon = searchParams.get('lon');
  const queryRep = searchParams.get('rep');

  const [selectedStation, setSelectedStation] = useState(HOTSPOTS[0]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [targetCoords, setTargetCoords] = useState(null);

  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Layer toggles
  const [showHotspots, setShowHotspots] = useState(true);
  const [showReports, setShowReports] = useState(true);

  // Community reports
  const [communityReports, setCommunityReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    setReportsLoading(true);
    getReports({ limit: 100 })
      .then((res) => {
        if (res.success) {
          setCommunityReports(res.reports || []);
          if (queryRep) {
            const found = res.reports.find((r) => r.id === queryRep);
            if (found) {
              setSelectedReport(found);
              setSelectedStation(null);
              setTargetCoords([found.latitude, found.longitude]);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, [queryRep]);

  useEffect(() => {
    if (queryLat && queryLon && !queryRep) {
      const lat = parseFloat(queryLat);
      const lon = parseFloat(queryLon);
      if (!isNaN(lat) && !isNaN(lon)) {
        setTargetCoords([lat, lon]);
      }
    }
  }, [queryLat, queryLon]);

  const filteredHotspots = HOTSPOTS.filter((h) => {
    const matchesSeverity = filterSeverity === 'ALL' || h.currentRisk === filterSeverity;
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const filteredReports = communityReports.filter((r) => {
    const matchesSeverity = filterSeverity === 'ALL' || r.severity === filterSeverity;
    const matchesSearch =
      (r.road_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Geospatial Risk Intelligence &bull; Multi-Layer GIS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Interactive Hazard &amp; Incident Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Explore monitoring telemetry stations and live citizen hazard observations across mountain terrain.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterSeverity(lvl)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterSeverity === lvl
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-glow-emerald transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </Link>
        </div>
      </div>

      {/* Layer Visibility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">GIS Map Layers:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showHotspots
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            Monitoring Stations ({filteredHotspots.length})
          </button>

          <button
            onClick={() => setShowReports(!showReports)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showReports
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            Community Incident Markers ({filteredReports.length})
          </button>
        </div>
      </div>

      {/* Main Map + Side Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map View */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4">
          <div className="relative w-full h-[520px] sm:h-[600px] rounded-xl overflow-hidden border border-slate-800 z-0">
            <MapContainer
              center={targetCoords || (selectedStation ? selectedStation.coordinates : [27.3389, 88.6065])}
              zoom={8}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <MapController coords={targetCoords || (selectedStation ? selectedStation.coordinates : null)} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              {/* HOTSPOT STATIONS LAYER */}
              {showHotspots &&
                filteredHotspots.map((hotspot) => {
                  const isSelected = selectedStation && selectedStation.id === hotspot.id;
                  const icon = createCustomMarkerIcon(hotspot.currentRisk, isSelected);
                  const config = RISK_LEVELS[hotspot.currentRisk] || RISK_LEVELS.LOW;

                  return (
                    <React.Fragment key={hotspot.id}>
                      <Circle
                        center={hotspot.coordinates}
                        radius={isSelected ? 4500 : 2500}
                        pathOptions={{
                          color: config.hex,
                          fillColor: config.hex,
                          fillOpacity: isSelected ? 0.25 : 0.12,
                          weight: isSelected ? 2 : 1,
                        }}
                      />

                      <Marker
                        position={hotspot.coordinates}
                        icon={icon}
                        eventHandlers={{
                          click: () => {
                            setSelectedStation(hotspot);
                            setSelectedReport(null);
                            setTargetCoords(hotspot.coordinates);
                          },
                        }}
                      >
                        <Popup>
                          <div className="p-1 space-y-1.5 text-slate-900">
                            <div className="font-bold text-sm text-slate-900">{hotspot.name}</div>
                            <div className="text-xs font-semibold text-slate-600">{hotspot.state}</div>
                            <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-slate-200">
                              <span>Risk Level:</span>
                              <span
                                className="font-bold px-2 py-0.5 rounded text-[11px] text-white"
                                style={{ backgroundColor: config.hex }}
                              >
                                {hotspot.currentRisk} ({Math.round(hotspot.probability * 100)}%)
                              </span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

              {/* COMMUNITY REPORTS LAYER */}
              {showReports &&
                filteredReports.map((report) => {
                  const isSelected = selectedReport && selectedReport.id === report.id;
                  const icon = createReportMarkerIcon(
                    report.incident_type,
                    report.verification_status,
                    report.severity,
                    isSelected
                  );

                  return (
                    <Marker
                      key={report.id}
                      position={[report.latitude, report.longitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          setSelectedReport(report);
                          setSelectedStation(null);
                          setTargetCoords([report.latitude, report.longitude]);
                        },
                      }}
                    >
                      <Popup>
                        <div className="p-1 space-y-2 text-slate-900 max-w-xs text-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                            <span className="font-bold text-xs uppercase text-slate-900">
                              {report.incident_type.replace('_', ' ')}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              report.verification_status === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                            }`}>
                              {report.verification_status}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-700">
                            {report.road_name || report.location_name || 'Observation point'}
                          </div>

                          <p className="text-slate-600 text-[11px]">
                            {report.description}
                          </p>

                          <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-200">
                            <span>Severity: {report.severity}</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        {/* Side Details Drawer */}
        <div className="lg:col-span-4 space-y-4">
          {selectedReport ? (
            /* REPORT DETAILS DRAWER */
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Community Incident Record
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {selectedReport.incident_type.replace('_', ' ')}
                  </h3>
                </div>

                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  selectedReport.verification_status === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {selectedReport.verification_status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    {selectedReport.road_name || selectedReport.location_name || 'Coordinates'}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-slate-500">
                  {selectedReport.latitude.toFixed(4)}°N, {selectedReport.longitude.toFixed(4)}°E
                </div>

                <p className="text-slate-300 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  "{selectedReport.description}"
                </p>

                {selectedReport.photo_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 max-h-48">
                    <img
                      src={selectedReport.photo_url.startsWith('http') ? selectedReport.photo_url : `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'}${selectedReport.photo_url}`}
                      alt="Incident photo"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                {selectedReport.authority_notes && (
                  <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Authority Verification Notes</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {selectedReport.authority_notes}
                    </p>
                    {selectedReport.action_taken && (
                      <p className="text-slate-400 text-[10px]">
                        <strong>Action:</strong> {selectedReport.action_taken}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => { setSelectedReport(null); setSelectedStation(HOTSPOTS[0]); }}
                  className="text-slate-400 hover:text-white"
                >
                  &larr; Back to Station View
                </button>

                <Link to="/reports" className="text-emerald-400 font-semibold hover:underline">
                  All Reports &rarr;
                </Link>
              </div>
            </div>
          ) : selectedStation ? (
            /* HOTSPOT STATION DETAILS DRAWER (Existing) */
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Station #{selectedStation.id.toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedStation.name}</h3>
                </div>
                <RiskBadge category={selectedStation.currentRisk} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">24h Rainfall</span>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedStation.rainfall} mm</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Soil Saturation</span>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedStation.soilMoisture}%</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Slope Angle</span>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedStation.slope}°</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Elevation</span>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{selectedStation.elevation} m</div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/villages?lat=${selectedStation.coordinates[0]}&lon=${selectedStation.coordinates[1]}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-glow-emerald"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Discover Nearby Villages</span>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
