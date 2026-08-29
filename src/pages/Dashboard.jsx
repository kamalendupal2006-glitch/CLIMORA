import React, { useState } from 'react';
import { HOTSPOTS } from '../data/mockData';
import RiskCard from '../components/RiskCard';
import EnvironmentalCard from '../components/EnvironmentalCard';
import RiskChart from '../components/RiskChart';
import MapPreview from '../components/MapPreview';
import WarningPanel from '../components/WarningPanel';
import RecommendationCard from '../components/RecommendationCard';
import HotspotSelector from '../components/HotspotSelector';
import NearbyAlertsBanner from '../components/NearbyAlertsBanner';
import { Activity, RefreshCw, ShieldAlert, FileDown, Layers, AlertOctagon, Building, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [selectedHotspot, setSelectedHotspot] = useState(HOTSPOTS[0]); // Default: Wayanad
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Real-Time Environmental &amp; Geotechnical Surveillance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Landslide Monitoring Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live telemetry integration covering high-susceptibility mountain basins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing Feeds...' : 'Sync Telemetry'}</span>
          </button>

          <Link
            to="/predict"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-glow-emerald transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Analyze Custom Coordinates</span>
          </Link>
        </div>
      </div>

      {/* Hotspot Station Switcher */}
      <HotspotSelector
        selectedHotspot={selectedHotspot}
        onSelectHotspot={(hotspot) => setSelectedHotspot(hotspot)}
      />

      {/* NEARBY COMMUNITY HAZARD ALERTS (if any exist near this station's coordinates) */}
      <NearbyAlertsBanner
        latitude={selectedHotspot.coordinates[0]}
        longitude={selectedHotspot.coordinates[1]}
        radiusKm={35}
      />

      {/* SECTION 1 — CURRENT RISK */}
      <section>
        <RiskCard
          locationName={selectedHotspot.name}
          category={selectedHotspot.currentRisk}
          probability={selectedHotspot.probability}
          lastUpdated={selectedHotspot.lastUpdated}
          trend={selectedHotspot.trend}
        />
      </section>

      {/* SECTION 2 — ENVIRONMENTAL CONDITIONS (6 Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Live Environmental &amp; Topographic Parameters</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Station ID: #{selectedHotspot.id.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <EnvironmentalCard
            type="rainfall"
            value={selectedHotspot.rainfall}
            unit="mm"
            context={
              selectedHotspot.rainfall > 100
                ? 'High-intensity precipitation active'
                : 'Precipitation within safe absorption limit'
            }
          />

          <EnvironmentalCard
            type="soilMoisture"
            value={selectedHotspot.soilMoisture}
            unit="%"
            context={
              selectedHotspot.soilMoisture > 75
                ? 'Severe saturation; high pore-water pressure'
                : 'Moisture within stable threshold'
            }
          />

          <EnvironmentalCard
            type="temperature"
            value={selectedHotspot.temperature}
            unit="°C"
            context="Ambient surface temperature"
          />

          <EnvironmentalCard
            type="slope"
            value={selectedHotspot.slope}
            unit="°"
            context={
              selectedHotspot.slope > 35
                ? 'Steep gravitational shear hazard'
                : 'Moderate terrain gradient'
            }
          />

          <EnvironmentalCard
            type="elevation"
            value={selectedHotspot.elevation}
            unit="m AMSL"
            context="Digital Elevation Model baseline"
          />

          <EnvironmentalCard
            type="soilType"
            value={selectedHotspot.soilType}
            unit=""
            context="Geological shear & permeability classification"
          />
        </div>
      </section>

      {/* QUICK DISCOVERY & REPORTING ACTIONS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={`/villages?lat=${selectedHotspot.coordinates[0]}&lon=${selectedHotspot.coordinates[1]}`}
          className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                Discover Settlements Near {selectedHotspot.name}
              </div>
              <div className="text-[11px] text-slate-400">
                Inspect remote mountain villages &amp; access status
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/report"
          className="bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                Report Road Obstruction or Hazard
              </div>
              <div className="text-[11px] text-slate-400">
                Submit citizen observation with GPS coordinates
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </section>

      {/* SECTION 3 & SECTION 4 — RISK TREND & MAP PREVIEW */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <RiskChart />
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <MapPreview
            coordinates={selectedHotspot.coordinates}
            locationName={selectedHotspot.name}
            category={selectedHotspot.currentRisk}
            probability={selectedHotspot.probability}
            rainfall={selectedHotspot.rainfall}
            slope={selectedHotspot.slope}
          />
        </div>
      </section>

      {/* SECTION 5 & SECTION 6 — EARLY WARNING & RECOMMENDED ACTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <WarningPanel />
        </div>

        <div className="lg:col-span-6 flex flex-col">
          <RecommendationCard category={selectedHotspot.currentRisk} />
        </div>
      </section>
    </div>
  );
}
