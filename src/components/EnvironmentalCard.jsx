import React from 'react';
import { CloudRain, Droplets, Thermometer, Mountain, Compass, Layers } from 'lucide-react';

export default function EnvironmentalCard({
  type = 'rainfall',
  value,
  unit,
  context,
  status = 'normal',
}) {
  const getCardConfig = () => {
    switch (type) {
      case 'rainfall':
        return {
          title: 'Precipitation (24h)',
          icon: CloudRain,
          iconColor: 'text-blue-400',
          iconBg: 'bg-blue-500/10 border-blue-500/20',
          gaugePct: Math.min(100, (parseFloat(value) / 200) * 100),
          gaugeColor: parseFloat(value) > 100 ? 'bg-rose-500' : parseFloat(value) > 50 ? 'bg-amber-500' : 'bg-blue-500',
          benchmark: 'Threshold: 100 mm/24h',
        };
      case 'soilMoisture':
        return {
          title: 'Soil Moisture Saturation',
          icon: Droplets,
          iconColor: 'text-cyan-400',
          iconBg: 'bg-cyan-500/10 border-cyan-500/20',
          gaugePct: Math.min(100, parseFloat(value)),
          gaugeColor: parseFloat(value) > 75 ? 'bg-rose-500' : parseFloat(value) > 50 ? 'bg-amber-500' : 'bg-cyan-500',
          benchmark: 'Critical limit: 75%',
        };
      case 'temperature':
        return {
          title: 'Ambient Temperature',
          icon: Thermometer,
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/10 border-emerald-500/20',
          gaugePct: Math.min(100, Math.max(0, ((parseFloat(value) + 10) / 50) * 100)),
          gaugeColor: 'bg-emerald-500',
          benchmark: 'Optimal range: 10 - 28°C',
        };
      case 'slope':
        return {
          title: 'Slope Incline Gradient',
          icon: Mountain,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/10 border-amber-500/20',
          gaugePct: Math.min(100, (parseFloat(value) / 60) * 100),
          gaugeColor: parseFloat(value) > 35 ? 'bg-rose-500' : parseFloat(value) > 25 ? 'bg-amber-500' : 'bg-emerald-500',
          benchmark: 'Shear risk angle: >30°',
        };
      case 'elevation':
        return {
          title: 'Terrain Elevation',
          icon: Compass,
          iconColor: 'text-purple-400',
          iconBg: 'bg-purple-500/10 border-purple-500/20',
          gaugePct: Math.min(100, (parseFloat(value) / 3500) * 100),
          gaugeColor: 'bg-purple-500',
          benchmark: 'Meters Above Sea Level',
        };
      case 'soilType':
      default:
        return {
          title: 'Geotechnical Soil Class',
          icon: Layers,
          iconColor: 'text-orange-400',
          iconBg: 'bg-orange-500/10 border-orange-500/20',
          gaugePct: null,
          gaugeColor: 'bg-orange-500',
          benchmark: 'Permeability & Shear Matrix',
        };
    }
  };

  const config = getCardConfig();
  const IconComponent = config.icon;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-slate-700/80 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {config.title}
          </span>
          <div className={`p-2 rounded-lg border ${config.iconBg}`}>
            <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-slate-400">
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80">
        {config.gaugePct !== null && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${config.gaugeColor}`}
              style={{ width: `${config.gaugePct}%` }}
            ></div>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate pr-2">{context || config.benchmark}</span>
          <span className="text-slate-500 text-[10px] font-mono shrink-0">TELEMETRY</span>
        </div>
      </div>
    </div>
  );
}
