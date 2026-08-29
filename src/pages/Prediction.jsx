import React, { useState } from 'react';
import { PRESET_PROFILES, RISK_LEVELS } from '../data/mockData';
import { predictLandslide } from '../services/predictionService';
import { requestCurrentPosition, formatAccuracy, GPS_ACCURACY_WARN_THRESHOLD_M } from '../services/gpsService';
import { fetchEnvironmentalData, extractFormValues, buildSourceStatus } from '../services/environmentalService';
import RiskBadge from '../components/RiskBadge';
import GeotechBreakdown from '../components/GeotechBreakdown';
import RecommendationCard from '../components/RecommendationCard';
import {
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Sliders,
  AlertCircle,
  MapPin,
  CloudRain,
  Droplets,
  Thermometer,
  Mountain,
  Compass,
  ArrowRight,
  Activity,
  Zap,
  Wind,
  TreePine,
  Clock,
  BarChart2,
  Globe,
  LocateFixed,
  RefreshCw,
  CheckCircle2,
  XCircle,
  WifiOff,
  Database,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Valid categorical options — must match backend training data exactly
// ---------------------------------------------------------------------------
const STATE_REGIONS = [
  'Arunachal Pradesh',
  'Assam',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Karnataka',
  'Kerala',
  'Manipur',
  'Maharashtra',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tamil Nadu',
  'Tripura',
  'Uttarakhand',
  'West Bengal',
];

const LAND_COVERS = [
  'Barren',
  'Built-up',
  'Cropland',
  'Forest',
  'Grassland',
  'Shrubland',
];

// ---------------------------------------------------------------------------
// Default form state — all 14 model features
// ---------------------------------------------------------------------------
const INITIAL_FORM = {
  // Location
  latitude: '27.3389',
  longitude: '88.6065',
  stateRegion: 'Sikkim',
  // Terrain
  elevation: '1487',
  slope: '25.0',
  aspect: '180',
  curvature: '0.05',
  // Environment
  rainfall: '4.3',
  soilMoisture: '32.6',   // displayed as %, converted to 0–1 for backend
  temperature: '21.0',
  humidity: '92.0',
  // Land / Context (Manual required)
  landCover: 'Forest',
  // Historical (Manual required)
  historicalLandslideCount: '3',
  daysSincePreviousEvent: '180',
};

// ---------------------------------------------------------------------------
// Small reusable form-field wrapper
// ---------------------------------------------------------------------------
function FormField({ label, icon: Icon, iconColor = 'text-slate-400', badge, error, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
          <span>{label}</span>
        </label>
        {badge && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
            {badge.text}
          </span>
        )}
      </div>
      {children}
      {error && <span className="text-[10px] text-rose-400 mt-1 block">{error}</span>}
      {hint && !error && <span className="text-[10px] text-slate-500 mt-1 block">{hint}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ icon: Icon, iconColor, title, badge }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.className}`}>
          {badge.text}
        </span>
      )}
    </div>
  );
}

// Shared input class builder
const inputCls = (err) =>
  `w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 ${
    err
      ? 'border-rose-500 focus:ring-rose-500'
      : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
  }`;

const selectCls = (err) =>
  `w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 ${
    err
      ? 'border-rose-500 focus:ring-rose-500'
      : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
  }`;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Prediction() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  // ---------------------------------------------------------------------------
  // GPS & Environmental Data State
  // ---------------------------------------------------------------------------
  const [locationStatus, setLocationStatus] = useState('idle');
  const [location, setLocation] = useState(null);      // { latitude, longitude, accuracy }
  const [locationError, setLocationError] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [envData, setEnvData] = useState(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envError, setEnvError] = useState(null);
  const [autoFetchedFields, setAutoFetchedFields] = useState({});

  // -------------------------------------------------------------------------
  // Fetch Environmental Data for Coordinates
  // -------------------------------------------------------------------------
  const fetchEnvForCoords = async (lat, lon) => {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const data = await fetchEnvironmentalData(lat, lon);
      if (data.success) {
        setEnvData(data);
        const extracted = extractFormValues(data);
        setFormData((prev) => ({
          ...prev,
          ...extracted,
        }));
        setAutoFetchedFields(extracted);
      } else {
        setEnvError(data.error || 'Failed to retrieve environmental data for location.');
      }
    } catch (err) {
      setEnvError(err.message || 'Environmental data service currently unreachable.');
    } finally {
      setEnvLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // GPS handler — GPS -> fetchEnvironmentalData() -> Auto-fill
  // ---------------------------------------------------------------------------
  const handleUseMyLocation = async () => {
    setLocationLoading(true);
    setLocationStatus('loading');
    setLocationError(null);
    setLocationWarning(null);
    setEnvError(null);

    try {
      const { position, warning } = await requestCurrentPosition();
      setLocation(position);
      setLocationWarning(warning);
      setLocationStatus(warning ? 'low_accuracy' : 'success');

      // Populate lat/lon
      setFormData((prev) => ({
        ...prev,
        latitude: position.latitude.toFixed(6),
        longitude: position.longitude.toFixed(6),
      }));

      // Clear any lat/lon errors
      setFormErrors((prev) => ({
        ...prev,
        latitude: null,
        longitude: null,
      }));

      // Trigger environmental data retrieval
      await fetchEnvForCoords(position.latitude, position.longitude);
    } catch (err) {
      setLocationError(err.message);
      setLocationStatus(err.code?.toLowerCase() || 'unavailable');
      setLocation(null);
    } finally {
      setLocationLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const validateForm = () => {
    const errors = {};

    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90)
      errors.latitude = 'Latitude must be between -90° and +90°';

    const lon = parseFloat(formData.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180)
      errors.longitude = 'Longitude must be between -180° and +180°';

    if (!formData.stateRegion)
      errors.stateRegion = 'Please select a state / region';

    const elev = parseFloat(formData.elevation);
    if (isNaN(elev) || elev < 0 || elev > 9000)
      errors.elevation = 'Elevation must be between 0 and 9000 m';

    const slope = parseFloat(formData.slope);
    if (isNaN(slope) || slope < 0 || slope > 90)
      errors.slope = 'Slope must be between 0° and 90°';

    const aspect = parseFloat(formData.aspect);
    if (isNaN(aspect) || aspect < 0 || aspect > 360)
      errors.aspect = 'Aspect must be between 0° and 360°';

    const curv = parseFloat(formData.curvature);
    if (isNaN(curv) || curv < -5 || curv > 5)
      errors.curvature = 'Curvature must be between -5 and +5';

    const rain = parseFloat(formData.rainfall);
    if (isNaN(rain) || rain < 0 || rain > 2000)
      errors.rainfall = 'Rainfall must be between 0 and 2000 mm';

    const moisture = parseFloat(formData.soilMoisture);
    if (isNaN(moisture) || moisture < 0 || moisture > 100)
      errors.soilMoisture = 'Soil moisture must be between 0% and 100%';

    const temp = parseFloat(formData.temperature);
    if (isNaN(temp) || temp < -50 || temp > 60)
      errors.temperature = 'Temperature must be between -50°C and +60°C';

    const hum = parseFloat(formData.humidity);
    if (isNaN(hum) || hum < 0 || hum > 100)
      errors.humidity = 'Humidity must be between 0% and 100%';

    if (!formData.landCover)
      errors.landCover = 'Please select a land cover type';

    const histCount = parseInt(formData.historicalLandslideCount, 10);
    if (isNaN(histCount) || histCount < 0)
      errors.historicalLandslideCount = 'Must be 0 or greater';

    const daysSince = parseInt(formData.daysSincePreviousEvent, 10);
    if (isNaN(daysSince) || daysSince < -1)
      errors.daysSincePreviousEvent = 'Must be -1 or greater (-1 for no recorded previous event)';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setActivePreset(null);
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleLoadPreset = (preset) => {
    setActivePreset(preset.id);
    setFormData({
      latitude: preset.data.latitude.toString(),
      longitude: preset.data.longitude.toString(),
      stateRegion: preset.data.stateRegion,
      elevation: preset.data.elevation.toString(),
      slope: preset.data.slope.toString(),
      aspect: preset.data.aspect.toString(),
      curvature: preset.data.curvature.toString(),
      rainfall: preset.data.rainfall.toString(),
      soilMoisture: preset.data.soilMoisture.toString(),
      temperature: preset.data.temperature.toString(),
      humidity: preset.data.humidity.toString(),
      landCover: preset.data.landCover,
      historicalLandslideCount: preset.data.historicalLandslideCount.toString(),
      daysSincePreviousEvent: preset.data.daysSincePreviousEvent.toString(),
    });
    setFormErrors({});
    setPredictionResult(null);
    setEnvData(null);
    setAutoFetchedFields({});
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setPredictionResult(null);
    setActivePreset(null);
    setLocationStatus('idle');
    setLocation(null);
    setLocationError(null);
    setLocationWarning(null);
    setEnvData(null);
    setEnvError(null);
    setAutoFetchedFields({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setPredictionResult(null);
    setLoadingStage('Calibrating landslide risk with XGBoost V2 model…');

    try {
      const result = await predictLandslide(formData);
      setPredictionResult(result);
    } catch (err) {
      setFormErrors({
        submit: err.message || 'Prediction service encountered an error. Please verify backend connectivity.',
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Real-World Environmental Telemetry &bull; XGBoost V2 Calibrated Pipeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Landslide Risk Prediction Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          GPS coordinate integration fetching live Open-Meteo meteorological telemetry and Copernicus DEM terrain gradients for calibrated early-warning inference.
        </p>
      </div>

      {/* Preset Quick Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Load Regional Scenario Presets:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            DEMO SCENARIOS &bull; CLICK 'USE GPS' FOR LIVE DATA
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_PROFILES.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-white mb-0.5">{preset.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{preset.locationName}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORM */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Input Parameters</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">14 FEATURES REQUIRED</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── LOCATION ── */}
            <div className="space-y-4">
              <SectionHeader
                icon={MapPin}
                iconColor="text-emerald-400"
                title="1. Location & Auto Telemetry"
                badge={{ text: 'GPS + Nominatim', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }}
              />

              {/* ── GPS & TELEMETRY FETCH PANEL ── */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live GPS & Environmental Telemetry</span>
                  </div>
                  {envLoading && (
                    <span className="text-[10px] font-mono text-emerald-400 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Fetching Open-Meteo...</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading || envLoading}
                    className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all duration-200 disabled:opacity-50 shadow-glow-emerald"
                  >
                    <LocateFixed className="w-4 h-4" />
                    <span>{locationLoading ? 'DETECTING GPS...' : envLoading ? 'ACQUIRING TELEMETRY...' : 'USE MY CURRENT LOCATION'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchEnvForCoords(parseFloat(formData.latitude), parseFloat(formData.longitude))}
                    disabled={envLoading || locationLoading}
                    className="w-full sm:w-auto px-3.5 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${envLoading ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Fetch Live For Coords</span>
                  </button>
                </div>

                {/* GPS Status & Accuracy Warning */}
                {(locationStatus === 'success' || locationStatus === 'low_accuracy') && location && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
                    locationStatus === 'low_accuracy'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}>
                    {locationStatus === 'low_accuracy' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    )}
                    <div className="space-y-0.5 font-mono text-[11px]">
                      <div className="font-bold text-white">
                        {locationStatus === 'low_accuracy' ? 'GPS Lock (Low Accuracy)' : 'GPS Location Acquired'}
                      </div>
                      <div>Lat: <span className="text-white">{location.latitude.toFixed(6)}°</span> | Lon: <span className="text-white">{location.longitude.toFixed(6)}°</span> | Accuracy: <span className="text-white">{formatAccuracy(location.accuracy)}</span></div>
                      {locationWarning && <div className="text-amber-400 text-[10px] mt-1">{locationWarning}</div>}
                    </div>
                  </div>
                )}

                {/* Environmental fetch error notice */}
                {envError && (
                  <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div className="space-y-1">
                      <div className="font-bold">Environmental Data Service Notice</div>
                      <p className="text-[11px] leading-relaxed">{envError}</p>
                    </div>
                  </div>
                )}

                {/* Validation Note for NER states if any */}
                {envData?.validation_notes?.length > 0 && (
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{envData.validation_notes[0]}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Latitude (°N)"
                  icon={MapPin}
                  iconColor={autoFetchedFields.latitude ? 'text-emerald-400' : 'text-slate-400'}
                  badge={autoFetchedFields.latitude ? { text: 'GPS', className: 'text-emerald-400 bg-emerald-500/10' } : null}
                  error={formErrors.latitude}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    placeholder="e.g. 27.3389"
                    className={inputCls(formErrors.latitude)}
                  />
                </FormField>
                <FormField
                  label="Longitude (°E)"
                  icon={MapPin}
                  iconColor={autoFetchedFields.longitude ? 'text-emerald-400' : 'text-slate-400'}
                  badge={autoFetchedFields.longitude ? { text: 'GPS', className: 'text-emerald-400 bg-emerald-500/10' } : null}
                  error={formErrors.longitude}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    placeholder="e.g. 88.6065"
                    className={inputCls(formErrors.longitude)}
                  />
                </FormField>
              </div>

              <FormField
                label="State / Region"
                icon={Globe}
                iconColor="text-teal-400"
                badge={autoFetchedFields.stateRegion ? { text: 'Nominatim OSM', className: 'text-teal-400 bg-teal-500/10' } : null}
                error={formErrors.stateRegion}
              >
                <select
                  value={formData.stateRegion}
                  onChange={(e) => handleInputChange('stateRegion', e.target.value)}
                  className={selectCls(formErrors.stateRegion)}
                >
                  {STATE_REGIONS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* ── TERRAIN ── */}
            <div className="space-y-4">
              <SectionHeader
                icon={Mountain}
                iconColor="text-amber-400"
                title="2. Topographic & Terrain Mechanics"
                badge={{ text: 'Copernicus 90m DEM', className: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Elevation (m AMSL)"
                  icon={Mountain}
                  iconColor="text-amber-400"
                  badge={autoFetchedFields.elevation ? { text: 'Live DEM', className: 'text-emerald-400 bg-emerald-500/10' } : null}
                  error={formErrors.elevation}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.elevation}
                    onChange={(e) => handleInputChange('elevation', e.target.value)}
                    placeholder="e.g. 1487"
                    className={inputCls(formErrors.elevation)}
                  />
                </FormField>
                <FormField
                  label="Slope Gradient (°)"
                  icon={Mountain}
                  iconColor="text-orange-400"
                  badge={autoFetchedFields.slope ? { text: 'Derived', className: 'text-indigo-400 bg-indigo-500/10' } : null}
                  error={formErrors.slope}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.slope}
                    onChange={(e) => handleInputChange('slope', e.target.value)}
                    placeholder="e.g. 25.0"
                    className={inputCls(formErrors.slope)}
                  />
                </FormField>
                <FormField
                  label="Aspect (°, 0–360)"
                  icon={Compass}
                  iconColor="text-purple-400"
                  badge={autoFetchedFields.aspect ? { text: 'Derived', className: 'text-indigo-400 bg-indigo-500/10' } : null}
                  error={formErrors.aspect}
                  hint="0°=North · 90°=East · 180°=South · 270°=West"
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.aspect}
                    onChange={(e) => handleInputChange('aspect', e.target.value)}
                    placeholder="e.g. 180"
                    className={inputCls(formErrors.aspect)}
                  />
                </FormField>
                <FormField
                  label="Terrain Curvature"
                  icon={BarChart2}
                  iconColor="text-indigo-400"
                  badge={autoFetchedFields.curvature ? { text: 'Derived', className: 'text-indigo-400 bg-indigo-500/10' } : null}
                  error={formErrors.curvature}
                  hint="Negative = concave · Positive = convex"
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.curvature}
                    onChange={(e) => handleInputChange('curvature', e.target.value)}
                    placeholder="e.g. 0.05"
                    className={inputCls(formErrors.curvature)}
                  />
                </FormField>
              </div>
            </div>

            {/* ── ENVIRONMENT ── */}
            <div className="space-y-4">
              <SectionHeader
                icon={CloudRain}
                iconColor="text-blue-400"
                title="3. Weather & Soil Hydrology"
                badge={{ text: 'Open-Meteo / ERA5', className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="24h Rainfall (mm)"
                  icon={CloudRain}
                  iconColor="text-blue-400"
                  badge={autoFetchedFields.rainfall ? { text: 'Live Model', className: 'text-blue-400 bg-blue-500/10' } : null}
                  error={formErrors.rainfall}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.rainfall}
                    onChange={(e) => handleInputChange('rainfall', e.target.value)}
                    placeholder="e.g. 4.3"
                    className={inputCls(formErrors.rainfall)}
                  />
                </FormField>
                <FormField
                  label="Soil Moisture (%)"
                  icon={Droplets}
                  iconColor="text-cyan-400"
                  badge={autoFetchedFields.soilMoisture ? { text: 'ERA5-Land', className: 'text-cyan-400 bg-cyan-500/10' } : null}
                  error={formErrors.soilMoisture}
                  hint="Enter 0–100 %. Converted to 0.0–1.0 for model."
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.soilMoisture}
                    onChange={(e) => handleInputChange('soilMoisture', e.target.value)}
                    placeholder="e.g. 32.6"
                    className={inputCls(formErrors.soilMoisture)}
                  />
                </FormField>
                <FormField
                  label="Temperature (°C)"
                  icon={Thermometer}
                  iconColor="text-emerald-400"
                  badge={autoFetchedFields.temperature ? { text: 'Live API', className: 'text-emerald-400 bg-emerald-500/10' } : null}
                  error={formErrors.temperature}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    placeholder="e.g. 21.0"
                    className={inputCls(formErrors.temperature)}
                  />
                </FormField>
                <FormField
                  label="Relative Humidity (%)"
                  icon={Wind}
                  iconColor="text-sky-400"
                  badge={autoFetchedFields.humidity ? { text: 'Live API', className: 'text-sky-400 bg-sky-500/10' } : null}
                  error={formErrors.humidity}
                >
                  <input
                    type="number"
                    step="any"
                    value={formData.humidity}
                    onChange={(e) => handleInputChange('humidity', e.target.value)}
                    placeholder="e.g. 92.0"
                    className={inputCls(formErrors.humidity)}
                  />
                </FormField>
              </div>
            </div>

            {/* ── LAND / CONTEXT (MANUAL REQUIRED) ── */}
            <div className="space-y-4">
              <SectionHeader
                icon={TreePine}
                iconColor="text-green-400"
                title="4. Land Cover Classification"
                badge={{ text: 'Manual Input Required', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }}
              />
              <FormField
                label="Land Cover Type *"
                icon={TreePine}
                iconColor="text-green-400"
                error={formErrors.landCover}
                hint="No free point-query API available without credentials. Select local terrain classification."
              >
                <select
                  value={formData.landCover}
                  onChange={(e) => handleInputChange('landCover', e.target.value)}
                  className={selectCls(formErrors.landCover)}
                >
                  {LAND_COVERS.map((lc) => (
                    <option key={lc} value={lc} className="bg-slate-900 text-white">{lc}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* ── HISTORICAL (MANUAL REQUIRED) ── */}
            <div className="space-y-4">
              <SectionHeader
                icon={Clock}
                iconColor="text-rose-400"
                title="5. Historical Landslide Indicators"
                badge={{ text: 'Manual Input Required', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }}
              />
              <p className="text-[10px] text-slate-500 -mt-2 leading-relaxed">
                No open point-query API exists for NE India event logs. Enter known historical records or use sentinel values.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Historical Landslide Count *"
                  icon={BarChart2}
                  iconColor="text-rose-400"
                  error={formErrors.historicalLandslideCount}
                  hint="Known past events in this micro-basin"
                >
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.historicalLandslideCount}
                    onChange={(e) => handleInputChange('historicalLandslideCount', e.target.value)}
                    placeholder="e.g. 3"
                    className={inputCls(formErrors.historicalLandslideCount)}
                  />
                </FormField>
                <FormField
                  label="Days Since Previous Event *"
                  icon={Clock}
                  iconColor="text-slate-400"
                  error={formErrors.daysSincePreviousEvent}
                  hint="Use -1 if no previous event is known"
                >
                  <input
                    type="number"
                    step="1"
                    min="-1"
                    value={formData.daysSincePreviousEvent}
                    onChange={(e) => handleInputChange('daysSincePreviousEvent', e.target.value)}
                    placeholder="e.g. 180 or -1"
                    className={inputCls(formErrors.daysSincePreviousEvent)}
                  />
                </FormField>
              </div>
            </div>

            {/* Error banner */}
            {formErrors.submit && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>CALIBRATING RISK…</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>ANALYZE RISK WITH V2 MODEL</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>
            </div>
          </form>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: LIVE DATA PROVENANCE & RESULT PANEL                  */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-6">
          {/* LIVE ENVIRONMENTAL DATA SUMMARY TABLE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Environmental Telemetry Provenance
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {envData ? `Retrieved: ${new Date(envData.retrieved_at).toLocaleTimeString()}` : 'Awaiting GPS Fetch'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">Parameter</th>
                    <th className="p-2">Value</th>
                    <th className="p-2">Source / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr>
                    <td className="p-2 text-slate-300">Coordinates</td>
                    <td className="p-2 text-white font-bold">{parseFloat(formData.latitude).toFixed(4)}°, {parseFloat(formData.longitude).toFixed(4)}°</td>
                    <td className="p-2">
                      <span className="text-emerald-400 font-semibold">{location ? 'Live GPS' : 'Manual / Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">State / Region</td>
                    <td className="p-2 text-white">{formData.stateRegion}</td>
                    <td className="p-2">
                      <span className="text-teal-400">{autoFetchedFields.stateRegion ? 'Live (Nominatim OSM)' : 'Configured'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Elevation</td>
                    <td className="p-2 text-white">{formData.elevation} m</td>
                    <td className="p-2">
                      <span className="text-emerald-400">{autoFetchedFields.elevation ? 'Live (Copernicus 90m)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Slope Gradient</td>
                    <td className="p-2 text-white">{formData.slope}°</td>
                    <td className="p-2">
                      <span className="text-indigo-400">{autoFetchedFields.slope ? 'Derived (Horn 1981)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Aspect / Curvature</td>
                    <td className="p-2 text-white">{formData.aspect}°, {formData.curvature}</td>
                    <td className="p-2">
                      <span className="text-indigo-400">{autoFetchedFields.aspect ? 'Derived (3×3 DEM)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Temperature</td>
                    <td className="p-2 text-white">{formData.temperature} °C</td>
                    <td className="p-2">
                      <span className="text-blue-400">{autoFetchedFields.temperature ? 'Live (Open-Meteo)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">24h Rainfall</td>
                    <td className="p-2 text-white">{formData.rainfall} mm</td>
                    <td className="p-2">
                      <span className="text-blue-400">{autoFetchedFields.rainfall ? 'Live (Open-Meteo)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Soil Moisture</td>
                    <td className="p-2 text-white">{formData.soilMoisture}%</td>
                    <td className="p-2">
                      <span className="text-cyan-400">{autoFetchedFields.soilMoisture ? 'Live (ERA5-Land)' : 'Preset'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Land Cover</td>
                    <td className="p-2 text-white">{formData.landCover}</td>
                    <td className="p-2">
                      <span className="text-amber-400 font-semibold">Manual Input</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-300">Historical Events</td>
                    <td className="p-2 text-white">{formData.historicalLandslideCount} events, {formData.daysSincePreviousEvent}d</td>
                    <td className="p-2">
                      <span className="text-amber-400 font-semibold">Manual Input</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RESULT PANEL */}
          {loading ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-6 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Activity className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Running Prediction</h3>
                <p className="text-xs text-emerald-400 font-mono transition-all">
                  {loadingStage || 'Connecting to backend…'}
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          ) : predictionResult ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Prediction Output
                    </span>
                    <h3 className="text-xl font-bold text-white">Calculated Hazard Assessment</h3>
                  </div>
                  <RiskBadge
                    level={predictionResult.risk_category}
                    size="lg"
                    pulse={predictionResult.risk_category === 'CRITICAL'}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
                    <span className="text-xs text-slate-400 font-semibold block mb-1">
                      Probability of Failure
                    </span>
                    <div className="text-4xl font-black text-white font-mono tracking-tight">
                      {predictionResult.probability_percent ?? Math.round(predictionResult.probability * 100)}%
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      Range: {RISK_LEVELS[predictionResult.risk_category]?.range ?? '—'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Risk Classification:</span>
                      <span className="font-bold text-white">{predictionResult.risk_category}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Coordinates:</span>
                      <span className="font-mono text-slate-300">
                        {parseFloat(formData.latitude).toFixed(4)}°, {parseFloat(formData.longitude).toFixed(4)}°
                        {location && (
                          <span className="ml-1 text-emerald-400 text-[10px]">GPS</span>
                        )}
                      </span>
                    </div>
                    {location && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>GPS Accuracy:</span>
                        <span className={`font-mono text-[10px] ${location.accuracy > GPS_ACCURACY_WARN_THRESHOLD_M ? 'text-amber-400' : 'text-slate-300'}`}>
                          ±{Math.round(location.accuracy)} m
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Model Version:</span>
                      <span className="font-mono text-slate-300 text-[10px]">
                        {predictionResult.model_version || '2.0-synthetic-calibrated-20260828'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Inference Source:</span>
                      <span className="font-mono text-emerald-400 text-[10px]">
                        FastAPI — XGBoost V2
                      </span>
                    </div>
                  </div>
                </div>

                {predictionResult.validation_note && (
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="space-y-0.5 font-mono text-[11px]">
                      <div className="font-bold text-amber-200 uppercase tracking-wide">Regional Deployment Notice</div>
                      <p className="text-amber-300/90 leading-relaxed">{predictionResult.validation_note}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    to={`/map?lat=${formData.latitude}&lon=${formData.longitude}`}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 py-2.5 rounded-xl transition-all"
                  >
                    <span>View Location on Geospatial Hazard Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <GeotechBreakdown factors={predictionResult.factors} />
              <RecommendationCard category={predictionResult.risk_category} />
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Prediction Results Awaiting Input</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Click <b className="text-emerald-400">USE MY CURRENT LOCATION</b> to auto-fetch live environmental & terrain data, complete the manual context inputs, then click <b className="text-emerald-400">ANALYZE RISK WITH V2 MODEL</b>.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-2 border-t border-slate-800/60">
                Prediction pipeline powered by CalibratedClassifierCV XGBoost V2
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
