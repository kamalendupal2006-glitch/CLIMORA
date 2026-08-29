import React from 'react';
import { Link } from 'react-router-dom';
import {
  MountainSnow,
  CloudRain,
  Droplets,
  Mountain,
  Compass,
  Layers,
  Cpu,
  Server,
  Code,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Flame,
  ArrowDown,
  ArrowRight,
  Activity,
  CheckCircle2,
  FileText,
  MapPin,
  Sparkles,
  Info,
  Radio,
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

export default function About() {
  const pipelineSteps = [
    {
      step: '01',
      title: 'Environmental Data',
      desc: 'Ingestion of precipitation (mm), soil moisture (%), ambient temperature (°C), slope angles, elevation, and geotechnical soil taxonomy.',
      icon: CloudRain,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      step: '02',
      title: 'Data Processing',
      desc: 'Feature engineering, normalization, topographic curvature derivation from DEM, and outlier filtration.',
      icon: Layers,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
    },
    {
      step: '03',
      title: 'XGBoost Prediction Model',
      desc: 'Gradient-boosted decision tree ensemble trained to evaluate non-linear multi-factor slope failure probability.',
      icon: Cpu,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      step: '04',
      title: 'Risk Probability',
      desc: 'Continuous probabilistic risk score computed from 0.00 (0% negligible) to 1.00 (100% imminent hazard).',
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      step: '05',
      title: 'Risk Classification',
      desc: 'Mapping raw probabilities into 4 standardized operational disaster tiers: LOW, MODERATE, HIGH, and CRITICAL.',
      icon: ShieldCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      step: '06',
      title: 'Early Warning',
      desc: 'Automated notification and Common Alerting Protocol (CAP) dispatches for local administrators and emergency responders.',
      icon: Radio,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      step: '07',
      title: 'Recommended Action',
      desc: 'Prescribed disaster management directives, evacuation protocols, route closures, and municipal checklists.',
      icon: FileText,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  const keyCapabilities = [
    {
      title: 'Landslide Risk Prediction',
      desc: 'Evaluates multi-parametric geographic, meteorological, and geotechnical data to predict localized slope failure probabilities.',
      icon: Cpu,
      color: 'text-emerald-400',
      badge: 'ML INFERENCE',
    },
    {
      title: 'Interactive Risk Map',
      desc: 'Geospatial visualization of vulnerable mountainous sectors, active monitoring stations, and terrain buffer zones via interactive Leaflet GIS.',
      icon: Compass,
      color: 'text-teal-400',
      badge: 'GEOSPATIAL GIS',
    },
    {
      title: 'Environmental Monitoring',
      desc: 'Continuous telemetry tracking for 24h precipitation accumulation, soil moisture pore pressure, slope incline gradients, and elevation.',
      icon: CloudRain,
      color: 'text-blue-400',
      badge: 'REAL-TIME DATA',
    },
    {
      title: 'Early Warning Dispatch',
      desc: 'Proactive hazard notifications with clear operational response windows (e.g. 12-24h advisory vs. immediate <2h emergency alert).',
      icon: Radio,
      color: 'text-rose-400',
      badge: 'ALERT BROADCAST',
    },
    {
      title: 'Risk Explanation & Factor Breakdown',
      desc: 'Transparent multi-factor attribution detailing how much slope steepness, rainfall intensity, and soil saturation contribute to overall risk.',
      icon: Layers,
      color: 'text-amber-400',
      badge: 'SHAP ATTRIBUTION',
    },
    {
      title: 'Recommended Action Directives',
      desc: 'Actionable emergency decision support matching each risk level with concrete checklists for district authorities and civil protection wardens.',
      icon: ShieldCheck,
      color: 'text-purple-400',
      badge: 'ACTION PROTOCOLS',
    },
  ];

  const riskLevels = [
    {
      level: 'LOW',
      title: 'Low Risk',
      guidance: 'Normal monitoring.',
      desc: 'Continue routine environmental monitoring and baseline telemetry checks. Geological and weather conditions indicate safe slope stability.',
      badgeColor: 'emerald',
      probRange: '0% – 29%',
      icon: ShieldCheck,
    },
    {
      level: 'MODERATE',
      title: 'Moderate Risk',
      guidance: 'Increased monitoring of environmental conditions.',
      desc: 'Elevated pore pressure or sustained precipitation detected. Increase sensor polling frequency, inspect drainage channels, and alert community wardens.',
      badgeColor: 'amber',
      probRange: '30% – 59%',
      icon: AlertTriangle,
    },
    {
      level: 'HIGH',
      title: 'High Risk',
      guidance: 'Prepare for possible emergency response.',
      desc: 'Critical soil moisture saturation and steep terrain gradients identified. Prepare evacuation routes, pre-position rescue teams, and restrict high-risk mountain roads.',
      badgeColor: 'orange',
      probRange: '60% – 79%',
      icon: AlertOctagon,
    },
    {
      level: 'CRITICAL',
      title: 'Critical Risk',
      guidance: 'Follow appropriate emergency and evacuation guidance.',
      desc: 'Imminent slope failure conditions identified. Execute mandatory evacuation of all red-zone occupants, broadcast sirens, and enforce full road closures.',
      badgeColor: 'rose',
      probRange: '80% – 100%',
      icon: Flame,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-20">
      {/* HERO SECTION */}
      <section className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-semibold font-mono shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>METHODOLOGY &amp; ARCHITECTURE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          CLIMORA
        </h1>

        <div className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
          Landslide Risk Prediction &amp; Early Warning
        </div>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          CLIMORA is an intelligent climate-tech and disaster prevention platform designed to evaluate
          the spatial probability and severity of rainfall-induced landslides across vulnerable mountainous terrain.
          By synthesizing terrain physics, meteorological telemetry, and geotechnical soil properties,
          CLIMORA empowers civil protection authorities with timely, life-saving early warnings.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/predict"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all"
          >
            <span>TEST RISK PREDICTION</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all"
          >
            <span>LIVE DASHBOARD</span>
          </Link>
        </div>
      </section>

      {/* SECTION 1 — THE PROBLEM */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" />
            <span>Hazard Dynamics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            The Problem: What Causes Landslides?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Landslides are complex geotechnical mass-wasting events triggered or worsened by multi-factor environmental and geological conditions:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <CloudRain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Heavy Rainfall</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Intense or multi-day rainfall infiltrates hillside soils, filling pores and generating pore-water pressure that reduces shear strength.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">High Soil Moisture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When sub-surface soil saturation exceeds absorption thresholds, cohesive strength degrades rapidly, accelerating slope instability.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Mountain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Steep Slope Gradient</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Terrain gradients exceeding 30° to 45° face high gravitational shear forces, requiring smaller moisture triggers to induce failure.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Elevation &amp; Orographic Relief</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              High elevations experience greater precipitation concentration, steeper watershed drainage chutes, and rapid runoff velocities.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Geological &amp; Soil Conditions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Weathered schists, silty clays, fractured bedrock, and loose colluvium exhibit low internal friction angles and high slip potential.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 w-fit rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Environmental Micro-Creep</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unplanned road toe-cuttings, deforestation, drainage disruption, and seismic micro-tremors accelerate shear plane displacement.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — HOW CLIMORA WORKS (VISUAL PIPELINE) */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Visual Pipeline
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            How CLIMORA Works: System Pipeline
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            The data-driven lifecycle from raw environmental parameters to actionable decision support:
          </p>
        </div>

        {/* Visual Pipeline */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative items-stretch">
            {pipelineSteps.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-full h-full bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {item.step}
                        </span>
                        <div className={`p-1.5 rounded-lg border ${item.bg}`}>
                          <IconComp className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                      </div>
                      <h3 className="text-xs font-bold text-white leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  {idx < pipelineSteps.length - 1 && (
                    <div className="my-2 md:hidden text-emerald-400">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 — KEY CAPABILITIES */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Core Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Key Capabilities
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Six foundational capabilities powering the CLIMORA early warning architecture:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {keyCapabilities.map((cap, idx) => {
            const IconComp = cap.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <IconComp className={`w-5 h-5 ${cap.color}`} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {cap.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{cap.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center text-[11px] text-emerald-400 font-medium">
                  <span>Included in Platform</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 — RISK LEVELS */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Classification Matrix
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Standard 4-Tier Risk Levels &amp; Action Guidance
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Consistent risk classification and recommended response across the entire application:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskLevels.map((r, idx) => {
            const IconComp = r.icon;
            const borderStyles = {
              emerald: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-950',
              amber: 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-950',
              orange: 'border-orange-500/30 bg-gradient-to-br from-orange-950/20 to-slate-950',
              rose: 'border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-slate-950',
            };

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-6 space-y-4 flex flex-col justify-between ${
                  borderStyles[r.badgeColor]
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <RiskBadge level={r.level} size="sm" />
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {r.probRange}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{r.title}</h3>
                    <div className="text-xs font-bold text-emerald-300 mt-1">
                      {r.guidance}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {r.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
                  ACTION PROTOCOL &bull; {r.level}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 5 — TECHNOLOGY */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-widest">
            <Server className="w-4 h-4" />
            <span>Tech Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Technology Stack &amp; Architecture Roadmap
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            The core technologies forming the eventual full-stack CLIMORA platform:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-emerald-400 font-mono">FRONTEND</div>
            <div className="text-sm font-bold text-white">React + Vite</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modern single-page interface with Tailwind CSS and Recharts data visualization.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-blue-400 font-mono">BACKEND</div>
            <div className="text-sm font-bold text-white">Python / FastAPI</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              High-performance asynchronous REST microservice server for ML inference requests.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-purple-400 font-mono">ML ENGINE</div>
            <div className="text-sm font-bold text-white">XGBoost</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gradient-boosted decision trees for multi-parametric slope stability classification.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-amber-400 font-mono">GEOSPATIAL</div>
            <div className="text-sm font-bold text-white">Geographic Mapping</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              React-Leaflet and Leaflet GIS integration with interactive risk hotspots and sector buffers.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-cyan-400 font-mono">PROTOCOL</div>
            <div className="text-sm font-bold text-white">REST API</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard JSON contract via <code className="text-emerald-400">POST /predict</code> for modular microservice communication.
            </p>
          </div>
        </div>

        {/* Machine Learning Roadmap Notice */}
        <div className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-white">Machine Learning Status &amp; Integration Notice:</span>
            <p className="text-slate-400 leading-relaxed">
              The XGBoost model (<code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">landslide_model.pkl</code>)
              will be trained on historical landslide inventories and integrated with the Python FastAPI backend in the upcoming backend phase.
              The model is not yet trained or deployed, and no model accuracy percentage is claimed at this stage. The frontend currently operates using a calibrated simulation mode for demo purposes.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 — DISCLAIMER */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Academic &amp; Operational Prototype Disclaimer
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              CLIMORA is developed as an academic and technological prototype. While the underlying calculations
              incorporate physics-informed geotechnical principles and empirical precipitation thresholds,
              predictions provided by this platform are for decision-support and demonstration purposes only.
              They must <b>not</b> replace official bulletins, evacuation orders, or directives issued by
              official disaster-management authorities, district collectors, the National Disaster Management Authority (NDMA),
              or the India Meteorological Department (IMD).
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
              <span>National Disaster Helpline: <b className="text-white">1078</b></span>
              <span>&bull;</span>
              <span>State Emergency Operations: <b className="text-white">1070</b></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}