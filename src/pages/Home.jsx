import React from 'react';
import { Link } from 'react-router-dom';
import {
  MountainSnow,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingUp,
  MapPin,
  Cpu,
  Layers,
  Bell,
  CloudRain,
  Compass,
  CheckCircle2,
  ChevronRight,
  Activity,
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { HOTSPOTS } from '../data/mockData';

export default function Home() {
  const featuredHotspot = HOTSPOTS[0]; // Wayanad

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Next-Gen Climate-Tech &bull; Automated Risk Analytics</span>
            </div>

            {/* Hero Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
              Predict Risk.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Protect Lives.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal">
              CLIMORA is an advanced landslide risk prediction and early-warning platform.
              By fusing real-time environmental telemetry, rainfall intensity, and geotechnical slope
              mechanics, CLIMORA delivers actionable early warnings before disaster strikes.
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/predict"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
              >
                <span>CHECK RISK</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all duration-200 text-base"
              >
                <span>EXPLORE RISK MAP</span>
                <Compass className="w-5 h-5 text-emerald-400" />
              </Link>
            </div>

            {/* Live Metrics Ticker Bar */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Stations</span>
                <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">8 Hotspots</div>
                <span className="text-[11px] text-emerald-400">Western Ghats & Himalayas</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Telemetry Polling</span>
                <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">Real-Time</div>
                <span className="text-[11px] text-slate-400">Rainfall & Soil Moisture</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Risk Classification</span>
                <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">4 Tiers</div>
                <span className="text-[11px] text-amber-400">Low to Critical</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">AI Architecture</span>
                <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-0.5">XGBoost</div>
                <span className="text-[11px] text-teal-400">FastAPI REST Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION 1: WHAT IS CLIMORA? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <MountainSnow className="w-4 h-4" />
                <span>Geotechnical Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                What is CLIMORA?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                CLIMORA is a specialized disaster management and early warning platform engineered to
                predict the spatial probability and severity of rainfall-induced landslides across
                vulnerable mountain belts in India (including the Western Ghats, Uttarakhand, Himachal Pradesh,
                and the Northeastern hills).
              </p>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                By synthesizing digital elevation data (DEM), slope geometry, historical geological stability,
                and real-time meteorological conditions, CLIMORA provides civil authorities and citizens with
                clear risk scores and actionable evacuation checklists.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Physics-Informed Geotechnical Model</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Hyper-Local Slope Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Automated Early Warning Protocols</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-300 uppercase">Station Spotlight</span>
                <RiskBadge level={featuredHotspot.currentRisk} size="sm" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{featuredHotspot.name}</div>
                <div className="text-xs text-slate-400">{featuredHotspot.state}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Rainfall (24h)</span>
                  <span className="font-mono font-bold text-white text-sm">{featuredHotspot.rainfall} mm</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Soil Moisture</span>
                  <span className="font-mono font-bold text-white text-sm">{featuredHotspot.soilMoisture}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Slope Angle</span>
                  <span className="font-mono font-bold text-white text-sm">{featuredHotspot.slope}°</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Risk Probability</span>
                  <span className="font-mono font-bold text-rose-400 text-sm">{Math.round(featuredHotspot.probability * 100)}%</span>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 py-2.5 rounded-xl transition-all"
              >
                <span>View Full Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: WHY LANDSLIDE EARLY WARNING MATTERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Disaster Risk Reduction
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Why Landslide Early Warning Matters
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Landslides strike with devastating velocity. Early prediction transforms catastrophe into proactive evacuation and resource mobilization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Life Preservation &amp; Timely Evacuation</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Providing vulnerable communities with even 4 to 12 hours of actionable lead time enables safe evacuation of downstream villages and hillside settlements.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Critical Mountain Transit Protection</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Mountain highways (NH-5, NH-58, Western Ghats corridors) face sudden blockages. Early risk alerts prevent vehicles from entering hazardous debris chute zones.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Disaster Response Pre-Positioning</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              State &amp; National Disaster Response Forces (SDRF/NDRF) can pre-deploy rescue teams, medical units, and heavy earthmovers before mountain roads become impassable.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: HOW CLIMORA WORKS (PIPELINE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              End-to-End System Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              How CLIMORA Works
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Our data-driven architecture processes multi-modal inputs through a machine learning inference engine to deliver actionable alerts.
            </p>
          </div>

          {/* Step-by-Step Architecture Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 relative">
            {[
              { step: '01', title: 'Environmental Data', desc: 'Rainfall, Moisture, Temp & DEM elevation telemetry' },
              { step: '02', title: 'Data Processing', desc: 'Feature scaling & geomorphological terrain extraction' },
              { step: '03', title: 'XGBoost ML Model', desc: 'Gradient boosted decision trees inference engine' },
              { step: '04', title: 'Risk Probability', desc: '0.00 to 1.00 calibrated probabilistic failure index' },
              { step: '05', title: 'Risk Classification', desc: 'Categorization into Low, Moderate, High, or Critical' },
              { step: '06', title: 'Early Warning', desc: 'Automated CAP broadcasts & severity alert dispatch' },
              { step: '07', title: 'Recommended Action', desc: 'Clear mitigation protocol & evacuation directives' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-emerald-500/50 transition-all"
              >
                <div>
                  <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {p.step}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                    {p.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Explore Full Geotechnical Methodology &amp; Mathematical Architecture</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. SECTION 4: KEY CAPABILITIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Core Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Key Capabilities
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Built for precision, speed, and real-world disaster decision-making.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="p-3 w-fit rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CloudRain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Multi-Factor Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Considers slope angle, 24h precipitation, soil moisture saturation, elevation, and geotechnical soil classes simultaneously.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="p-3 w-fit rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Real-Time Early Warning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic alert triggers when cumulative rainfall or soil moisture exceeds empirical pore-water pressure safety limits.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Interactive Geospatial GIS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High-resolution interactive map built on React-Leaflet to visualize regional hotspots, risk zones, and buffer sectors.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Decision Action Protocols</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Translates mathematical risk probabilities into 4 clear operational levels with practical checklists for local authorities.
            </p>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5: RISK MONITORING PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Live Sensor Telemetry Sample
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Risk Monitoring Preview
              </h2>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors self-start sm:self-auto"
            >
              <span>OPEN LIVE DASHBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {HOTSPOTS.slice(0, 3).map((hotspot) => (
              <div
                key={hotspot.id}
                className="bg-slate-950 border border-slate-800/90 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{hotspot.name}</h3>
                    <span className="text-xs text-slate-400">{hotspot.state}</span>
                  </div>
                  <RiskBadge level={hotspot.currentRisk} size="sm" />
                </div>

                <div className="flex items-baseline justify-between border-y border-slate-900 py-3">
                  <span className="text-xs text-slate-400">Risk Probability:</span>
                  <span className="text-xl font-bold text-white font-mono">
                    {Math.round(hotspot.probability * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Rainfall:</span>
                    <span className="font-mono font-semibold">{hotspot.rainfall} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Moisture:</span>
                    <span className="font-mono font-semibold">{hotspot.soilMoisture}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Slope:</span>
                    <span className="font-mono font-semibold">{hotspot.slope}°</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Elevation:</span>
                    <span className="font-mono font-semibold">{hotspot.elevation} m</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {hotspot.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SECTION 6: CALL TO ACTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-8 sm:p-14 space-y-6 shadow-glow-emerald">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to Evaluate Slope Stability?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Test the custom Risk Prediction Studio by entering custom coordinates or loading preset high-risk disaster scenarios.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/predict"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all text-sm"
            >
              <span>LAUNCH PREDICTION STUDIO</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-all text-sm"
            >
              <span>VIEW DASHBOARD</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
