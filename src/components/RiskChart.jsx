import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { HISTORICAL_HOURLY_TREND, SEVEN_DAY_FORECAST } from '../data/mockData';
import { TrendingUp, BarChart2, Calendar } from 'lucide-react';

export default function RiskChart() {
  const [viewMode, setViewMode] = useState('24h'); // '24h' | '7d'

  const data = viewMode === '24h' ? HISTORICAL_HOURLY_TREND : SEVEN_DAY_FORECAST;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const riskVal = Math.round((p.risk || 0) * 100);
      const rainVal = p.rainfall || 0;

      let riskCategory = 'LOW';
      let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      if (riskVal >= 80) {
        riskCategory = 'CRITICAL';
        badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      } else if (riskVal >= 60) {
        riskCategory = 'HIGH';
        badgeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      } else if (riskVal >= 30) {
        riskCategory = 'MODERATE';
        badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      }

      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[160px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{viewMode === '24h' ? `Time: ${label}` : `Day: ${label}`}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
              {riskCategory}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Risk Probability:</span>
            <span className="font-mono font-bold text-white">{riskVal}%</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Rainfall:</span>
            <span className="font-mono font-bold text-blue-400">{rainVal} mm</span>
          </div>
          {p.moisture && (
            <div className="flex justify-between gap-4 text-slate-300">
              <span className="text-slate-400">Soil Moisture:</span>
              <span className="font-mono font-bold text-cyan-400">{p.moisture}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Temporal Risk Dynamics</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Landslide Risk Probability & Precipitation Trend
          </h3>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('24h')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              viewMode === '24h'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            24-Hour Timeline
          </button>
          <button
            onClick={() => setViewMode('7d')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              viewMode === '7d'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            7-Day Forecast
          </button>
        </div>
      </div>

      {/* Threshold Reference Indicator Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Critical Alert (&ge;80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span>High Risk (&ge;60%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Moderate Risk (&ge;30%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Low Risk (&lt;30%)</span>
        </div>
      </div>

      {/* Recharts Component */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="45%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="75%" stopColor="#eab308" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey={viewMode === '24h' ? 'time' : 'day'}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[0, 1]}
              tickFormatter={(val) => `${Math.round(val * 100)}%`}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Threshold Reference Lines */}
            <ReferenceLine y={0.8} stroke="#f43f5e" strokeDasharray="4 4" opacity={0.6} />
            <ReferenceLine y={0.6} stroke="#f97316" strokeDasharray="4 4" opacity={0.4} />
            <ReferenceLine y={0.3} stroke="#eab308" strokeDasharray="4 4" opacity={0.4} />

            <Area
              type="monotone"
              dataKey="risk"
              stroke="#fb7185"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#riskGradient)"
              activeDot={{ r: 6, fill: '#fb7185', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          Model probability dynamically calibrated against rainfall peak at 18:00 (Chooralmala sensor).
        </p>
        <span className="text-[11px] text-slate-500 font-mono">XGBOOST INFERENCE PIPELINE</span>
      </div>
    </div>
  );
}
