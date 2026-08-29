import React, { useState } from 'react';
import { ACTIVE_EARLY_WARNINGS, RISK_LEVELS } from '../data/mockData';
import { AlertCircle, Bell, ChevronRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function WarningPanel({ warnings = ACTIVE_EARLY_WARNINGS }) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filteredWarnings =
    activeFilter === 'ALL'
      ? warnings
      : warnings.filter((w) => w.severity === activeFilter);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>Live Early Warning Dispatch</span>
          </div>
          <h3 className="text-lg font-bold text-white">Active Environmental Alerts</h3>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings List */}
      <div className="space-y-3 mt-2">
        {filteredWarnings.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-semibold text-slate-300">No Active Alerts in this Category</div>
            <p className="text-xs text-slate-500 mt-1">All telemetry is within baseline safety parameters.</p>
          </div>
        ) : (
          filteredWarnings.map((warning) => {
            const config = RISK_LEVELS[warning.severity] || RISK_LEVELS.LOW;
            const borderColors = {
              CRITICAL: 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/10',
              HIGH: 'border-orange-500/30 hover:border-orange-500/60 bg-orange-950/10',
              MODERATE: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10',
              LOW: 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10',
            };

            return (
              <div
                key={warning.id}
                className={`border rounded-xl p-4 transition-all duration-200 ${
                  borderColors[warning.severity] || 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={warning.severity} size="sm" />
                    <span className="text-xs font-semibold text-slate-300">
                      {warning.region}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {warning.timestamp}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-1">{warning.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {warning.message}
                </p>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                    Trigger: {warning.trigger}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Early warning alerts automatically broadcasted via SMS / CAP protocol.</span>
        <span className="font-mono text-[11px] text-rose-400 font-semibold">LIVE CAP FEED</span>
      </div>
    </div>
  );
}
