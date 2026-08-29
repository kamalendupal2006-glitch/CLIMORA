import React from 'react';
import { HOTSPOTS } from '../data/mockData';
import { MapPin } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function HotspotSelector({ selectedHotspot, onSelectHotspot }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Active Regional Monitoring Hotspots:
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          {HOTSPOTS.length} STATIONS ONLINE
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {HOTSPOTS.map((hotspot) => {
          const isSelected = selectedHotspot && selectedHotspot.id === hotspot.id;

          return (
            <button
              key={hotspot.id}
              onClick={() => onSelectHotspot(hotspot)}
              className={`text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-white truncate mb-0.5">
                  {hotspot.name.split('(')[0].trim()}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {hotspot.state}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <RiskBadge level={hotspot.currentRisk} size="sm" showIcon={false} />
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {Math.round(hotspot.probability * 100)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
