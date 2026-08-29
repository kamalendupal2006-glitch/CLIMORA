import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, MapPin, ChevronRight, X, Info, AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getNearbyAlerts } from '../services/communityReportService';

export default function NearbyAlertsBanner({ latitude, longitude, radiusKm = 30 }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;

    let isMounted = true;
    setLoading(true);

    getNearbyAlerts(latitude, longitude, radiusKm)
      .then((res) => {
        if (isMounted && res.success) {
          setAlerts(res.alerts || []);
        }
      })
      .catch(() => {
        // Silently keep empty if backend offline
        if (isMounted) setAlerts([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, radiusKm]);

  if (dismissed || alerts.length === 0) return null;

  const topAlert = alerts[0];

  return (
    <div className="space-y-3">
      <div className={`p-4 rounded-2xl border transition-all ${
        topAlert.is_verified
          ? 'bg-red-950/40 border-red-500/50 shadow-glow-red'
          : 'bg-amber-950/30 border-amber-500/40'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 ${
              topAlert.is_verified ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {topAlert.is_verified ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono ${
                  topAlert.is_verified
                    ? 'bg-red-500 text-white'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {topAlert.is_verified ? 'OFFICIAL HAZARD NOTICE' : 'UNVERIFIED COMMUNITY REPORT'}
                </span>

                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{topAlert.affected_location}</span>
                  <span className="text-slate-500">({topAlert.distance_km} km away)</span>
                </span>

                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                  topAlert.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                  topAlert.severity === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {topAlert.severity} SEVERITY
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 font-medium">
                {topAlert.advisory}
              </p>

              {/* Expandable Caution / Verification details */}
              {expandedAlertId === topAlert.alert_id && (
                <div className="pt-2 mt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
                  <div className="flex items-start gap-1.5 text-amber-200/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>{topAlert.caution_notice}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Reported: {new Date(topAlert.reported_at).toLocaleString()}</span>
                    <Link to="/reports" className="text-emerald-400 hover:underline font-semibold">
                      View all {alerts.length} active alerts &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setExpandedAlertId(expandedAlertId === topAlert.alert_id ? null : topAlert.alert_id)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-all"
            >
              {expandedAlertId === topAlert.alert_id ? 'Less Details' : 'View Advisory'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
