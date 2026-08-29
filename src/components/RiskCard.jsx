import React from 'react';
import RiskBadge from './RiskBadge';
import { RISK_LEVELS } from '../data/mockData';
import { TrendingUp, Clock, MapPin, Activity } from 'lucide-react';

export default function RiskCard({
  locationName = 'Wayanad (Chooralmala)',
  category = 'CRITICAL',
  probability = 0.88,
  lastUpdated = '10 mins ago',
  trend = '+12% (Last 6h)',
}) {
  const normCategory = (category || 'LOW').toUpperCase();
  const config = RISK_LEVELS[normCategory] || RISK_LEVELS.LOW;
  const percentage = Math.round((probability || 0) * 100);

  // Calculate radial SVG circle circumference
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getBorderGlow = () => {
    switch (normCategory) {
      case 'CRITICAL':
        return 'border-rose-500/40 shadow-glow-rose bg-gradient-to-br from-rose-950/20 to-slate-900/90';
      case 'HIGH':
        return 'border-orange-500/40 shadow-glow-amber bg-gradient-to-br from-orange-950/20 to-slate-900/90';
      case 'MODERATE':
        return 'border-amber-500/40 shadow-glow-amber bg-gradient-to-br from-amber-950/20 to-slate-900/90';
      case 'LOW':
      default:
        return 'border-emerald-500/40 shadow-glow-emerald bg-gradient-to-br from-emerald-950/20 to-slate-900/90';
    }
  };

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 backdrop-blur-md transition-all duration-300 ${getBorderGlow()}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Active Station Surveillance</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-300" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {locationName}
            </h2>
          </div>
        </div>

        <RiskBadge level={normCategory} size="lg" pulse={normCategory === 'CRITICAL' || normCategory === 'HIGH'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-center">
        {/* Radial Probability Meter */}
        <div className="md:col-span-5 flex items-center justify-center sm:justify-start gap-5">
          <div className="relative flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={config.hex}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tighter">
                {percentage}%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Probability
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Calculated Status</span>
            <div className="text-lg font-bold text-white">{config.label}</div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
              {config.description}
            </p>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last Telemetry Sync</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-white font-mono">
              {lastUpdated}
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Satellite / IoT Feeds
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span>24h Risk Trajectory</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-white font-mono">
              {trend}
            </div>
            <span className="text-[11px] text-slate-400">
              Correlated with cumulative precipitation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
