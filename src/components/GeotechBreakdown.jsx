import React from 'react';
import { Layers, AlertCircle, Info } from 'lucide-react';

export default function GeotechBreakdown({ factors = [] }) {
  if (!factors || factors.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Multi-Factor Risk Attribution</span>
          </div>
          <h3 className="text-lg font-bold text-white">Contributing Environmental Factors</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">XGBOOST FEATURE WEIGHTS</span>
      </div>

      <div className="space-y-4">
        {factors.map((factor, idx) => {
          const getBarColor = (severity) => {
            switch (severity) {
              case 'high':
                return 'bg-rose-500';
              case 'moderate':
                return 'bg-amber-500';
              case 'low':
              default:
                return 'bg-emerald-500';
            }
          };

          return (
            <div key={idx} className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{factor.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-300 font-bold">{factor.value}</span>
                  <span className="text-[11px] font-mono text-slate-400">({factor.impact}% impact)</span>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${getBarColor(factor.severity)}`}
                  style={{ width: `${Math.max(5, factor.impact)}%` }}
                ></div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                {factor.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>Factor contributions are derived via SHAP / feature importance ranking across slope, rainfall, and moisture variables.</span>
      </div>
    </div>
  );
}
