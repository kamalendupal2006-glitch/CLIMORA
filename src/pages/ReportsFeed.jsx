import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Navigation,
  ShieldCheck,
  AlertOctagon,
  Eye,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReports, getNearbyReports } from '../services/communityReportService';
import { requestCurrentPosition } from '../services/gpsService';
import NearbyAlertsBanner from '../components/NearbyAlertsBanner';

const INCIDENT_TYPES = [
  'ALL',
  'ROAD_BLOCKAGE',
  'LANDSLIDE',
  'ROCKFALL',
  'SLOPE_CRACK',
  'SOIL_MOVEMENT',
  'FLOOD',
  'INFRASTRUCTURE_DAMAGE',
  'OTHER',
];

const STATUS_FILTERS = ['ALL', 'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED'];

export default function ReportsFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Proximity mode
  const [nearbyMode, setNearbyMode] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [gpsLoading, setGpsLoading] = useState(false);

  const fetchReportsData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (nearbyMode && userLocation) {
        const res = await getNearbyReports(userLocation.latitude, userLocation.longitude, radiusKm, {
          status: statusFilter,
          incident_type: typeFilter,
        });
        setReports(res.reports || []);
      } else {
        const res = await getReports({
          status: statusFilter,
          incident_type: typeFilter,
          search: searchQuery,
          limit: 100,
        });
        setReports(res.reports || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load community reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [statusFilter, typeFilter, nearbyMode, userLocation, radiusKm]);

  const handleToggleNearby = async () => {
    if (!nearbyMode) {
      setGpsLoading(true);
      try {
        const { position } = await requestCurrentPosition();
        setUserLocation(position);
        setNearbyMode(true);
      } catch (err) {
        alert(err.message || 'Unable to access device GPS.');
      } finally {
        setGpsLoading(false);
      }
    } else {
      setNearbyMode(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            VERIFIED INCIDENT
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-mono">
            <Clock className="w-3 h-3" />
            UNDER REVIEW
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            RESOLVED / CLEARED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
            <AlertTriangle className="w-3 h-3" />
            UNVERIFIED CITIZEN REPORT
          </span>
        );
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>Community Hazard Stream &bull; Live Observations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Community Reports &amp; Road Blockages
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time citizen observations and hazard verifications across transit corridors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Report Incident</span>
          </Link>

          <button
            onClick={fetchReportsData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Proximity Alerts Banner if GPS active */}
      {userLocation && (
        <NearbyAlertsBanner latitude={userLocation.latitude} longitude={userLocation.longitude} radiusKm={radiusKm} />
      )}

      {/* Controls & Filters */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, highway, or village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReportsData()}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Proximity Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleNearby}
              disabled={gpsLoading}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                nearbyMode
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-glow-emerald'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{nearbyMode ? `Nearby Mode (${radiusKm} km)` : 'Filter by My Location'}</span>
            </button>

            {nearbyMode && (
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-slate-500 font-semibold uppercase text-[10px] mr-1">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-slate-500 font-semibold uppercase text-[10px] mr-1">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading community hazard reports...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl text-center text-xs space-y-2">
          <AlertTriangle className="w-6 h-6 mx-auto text-red-400" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Hazard Reports Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No matching community incident reports were found for the selected filter criteria.
            </p>
          </div>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-glow-emerald"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit a Community Report</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {getStatusBadge(report.verification_status)}
                      {getSeverityBadge(report.severity)}
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {report.incident_type.replace('_', ' ')}
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium">
                    {report.road_name ? `${report.road_name}` : ''}
                    {report.road_name && report.location_name ? ' &bull; ' : ''}
                    {report.location_name || `${report.latitude.toFixed(4)}°N, ${report.longitude.toFixed(4)}°E`}
                  </span>
                  {report.distance_km != null && (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold ml-1">
                      ({report.distance_km} km away)
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {report.description}
                </p>

                {/* Media Attachment Thumbnail if present */}
                {report.photo_url && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 max-h-40">
                    <img
                      src={report.photo_url.startsWith('http') ? report.photo_url : `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'}${report.photo_url}`}
                      alt="Incident evidence"
                      className="w-full h-36 object-cover"
                    />
                  </div>
                )}

                {/* Authority note if verified or under review */}
                {report.authority_notes && (
                  <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Authority Review Note</span>
                    </div>
                    <p className="text-slate-300 text-[11px] italic">
                      "{report.authority_notes}"
                    </p>
                    {report.action_taken && (
                      <p className="text-slate-400 text-[10px]">
                        <strong>Action:</strong> {report.action_taken}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Links */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[10px] font-mono">
                  ID: #{report.id}
                </span>

                <Link
                  to={`/map?lat=${report.latitude}&lon=${report.longitude}&rep=${report.id}`}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>View on Hazard Map</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
