import React from 'react';
import { RECOMMENDED_ACTIONS, RISK_LEVELS } from '../data/mockData';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame, CheckCircle, FileText, PhoneCall } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function RecommendationCard({ category = 'CRITICAL' }) {
  const normCategory = (category || 'LOW').toUpperCase();
  const actionData = RECOMMENDED_ACTIONS[normCategory] || RECOMMENDED_ACTIONS.LOW;
  const config = RISK_LEVELS[normCategory] || RISK_LEVELS.LOW;

  const getHeaderIcon = () => {
    switch (normCategory) {
      case 'CRITICAL':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'HIGH':
        return <AlertOctagon className="w-5 h-5 text-orange-400" />;
      case 'MODERATE':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'LOW':
      default:
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getBorderTheme = () => {
    switch (normCategory) {
      case 'CRITICAL':
        return 'border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900';
      case 'HIGH':
        return 'border-orange-500/30 bg-gradient-to-br from-orange-950/20 via-slate-900 to-slate-900';
      case 'MODERATE':
        return 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900';
      case 'LOW':
      default:
        return 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900';
    }
  };

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 backdrop-blur-md transition-all duration-300 ${getBorderTheme()}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {getHeaderIcon()}
            <span>Emergency Decision Support Protocol</span>
          </div>
          <h3 className="text-lg font-bold text-white">{actionData.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Response Window:</span>
          <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {actionData.leadTime}
          </span>
        </div>
      </div>

      {/* Primary Action Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
          Primary Direct Action
        </span>
        <p className="text-sm font-semibold text-white leading-relaxed">
          {actionData.primaryAction}
        </p>
      </div>

      {/* Action Checklist */}
      <div className="space-y-2.5 mb-5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Mitigation & Response Checklist:
        </span>
        {actionData.checklist.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{item}</span>
          </div>
        ))}
      </div>

      {/* Authority Directive */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-xs text-slate-300">
          <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Disaster Authority Guidance: </span>
            <span>{actionData.authorityGuidance}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <PhoneCall className="w-3 h-3" />
            NDMA Helpline: 1078
          </span>
        </div>
      </div>
    </div>
  );
}
