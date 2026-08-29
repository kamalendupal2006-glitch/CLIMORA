import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  Database,
  Building,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestCurrentPosition, formatAccuracy } from '../services/gpsService';
import { getNearbyVillages } from '../services/villageService';
import { HOTSPOTS } from '../data/mockData';

const NE_PRESETS = [
  { name: 'Gangtok, Sikkim', lat: 27.3389, lon: 88.6065 },
  { name: 'Mangan, North Sikkim', lat: 27.5086, lon: 88.5338 },
  { name: 'Shillong, Meghalaya', lat: 25.5788, lon: 91.8933 },
  { name: 'Cherrapunji (Sohra), Meghalaya', lat: 25.2702, lon: 91.7323 },
  { name: 'Tawang, Arunachal Pradesh', lat: 27.5861, lon: 91.8594 },
  { name: 'Kohima, Nagaland', lat: 25.6751, lon: 94.1086 },
  { name: 'Wayanad, Kerala', lat: 11.6854, lon: 76.1320 },
];

export default function VillageDiscovery() {
  const [latitude, setLatitude] = useState(27.3389);
  const [longitude, setLongitude] = useState(88.6065);
  const [radiusKm, setRadiusKm] = useState(20);

  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('OpenStreetMap Overpass API');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const fetchVillages = async (lat = latitude, lon = longitude, rad = radiusKm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNearbyVillages(lat, lon, rad, 40);
      if (res.success) {
        setVillages(res.villages || []);
        if (res.data_source) setDataSource(res.data_source);
      } else {
        setError(res.error || 'Failed to discover nearby villages.');
        setVillages([]);
      }
    } catch (err) {
      setError(err.message || 'Settlement discovery service currently unavailable.');
      setVillages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages(latitude, longitude, radiusKm);
  }, []);

  const handleGpsDetect = async () => {
    setGpsLoading(true);
    setError(null);
    try {
      const { position } = await requestCurrentPosition();
      setLatitude(Number(position.latitude.toFixed(5)));
      setLongitude(Number(position.longitude.toFixed(5)));
      setGpsAccuracy(position.accuracy);
      fetchVillages(position.latitude, position.longitude, radiusKm);
    } catch (err) {
      alert(err.message || 'Failed to acquire GPS location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePresetSelect = (preset) => {
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    fetchVillages(preset.lat, preset.lon, radiusKm);
  };

  const getConnectivityBadge = (status) => {
    switch (status) {
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-mono">
            <AlertOctagon className="w-3 h-3" />
            ROAD BLOCKED (CONFIRMED)
          </span>
        );
      case 'POSSIBLE_ISSUE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
            <AlertTriangle className="w-3 h-3" />
            POSSIBLE ACCESS ISSUE (UNVERIFIED)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            NORMAL ACCESS
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Geospatial Habitats &bull; Remote Settlement Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Remote Villages &amp; Access Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Discover mountain villages, hamlets, and settlements near GPS coordinates and inspect live road connectivity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGpsDetect}
            disabled={gpsLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all"
          >
            <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Acquiring GPS...' : 'Find Villages Near Me'}</span>
          </button>
        </div>
      </div>

      {/* Coordinate & Search Control Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Latitude (WGS84)
            </label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Longitude (WGS84)
            </label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Radius (km)
            </label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={35}>35 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => fetchVillages(latitude, longitude, radiusKm)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-glow-emerald disabled:opacity-60"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Quick Regional Presets */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">North East Hotspots:</span>
          {NE_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetSelect(p)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                Math.abs(latitude - p.lat) < 0.01 && Math.abs(longitude - p.lon) < 0.01
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Provenance & Safety Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-300">
        <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white flex items-center gap-2">
            <span>Authoritative Data Provenance &bull; {dataSource}</span>
          </p>
          <p className="text-slate-400 leading-relaxed">
            Settlement geometries are retrieved directly from indexed geospatial nodes (place=village, hamlet, town). Road connectivity cross-references active verified and unverified community reports. Production architecture supports direct integration with Census of India Village Directory and PMGSY Rural Roads PostGIS layers.
          </p>
        </div>
      </div>

      {/* DISCOVERED SETTLEMENTS GRID */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Querying authoritative settlement nodes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl text-center text-xs space-y-2">
          <AlertTriangle className="w-6 h-6 mx-auto text-red-400" />
          <p className="font-semibold">{error}</p>
          <p className="text-slate-400 text-[11px]">
            If external OpenStreetMap servers are throttled, please retry with a smaller search radius or another coordinate point.
          </p>
        </div>
      ) : villages.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <Building className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Indexed Settlements Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No village or hamlet nodes were found within {radiusKm} km of coordinates ({latitude}, {longitude}).
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Found <strong>{villages.length}</strong> settlements within {radiusKm} km</span>
            <span className="font-mono text-[11px]">Sorted by proximity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {villages.map((v) => (
              <div
                key={v.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500">
                        {v.place_type}
                      </span>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {v.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {v.distance_km} km
                      </span>
                      <div className="text-[10px] text-slate-500">from origin</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {v.district ? `${v.district}, ` : ''}
                      {v.state || 'North Eastern Region'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="mb-1.5">{getConnectivityBadge(v.road_connectivity_status)}</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {v.connectivity_notes}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{v.latitude.toFixed(4)}°N, {v.longitude.toFixed(4)}°E</span>
                  <Link
                    to={`/map?lat=${v.latitude}&lon=${v.longitude}`}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" />
                    <span>Inspect</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
