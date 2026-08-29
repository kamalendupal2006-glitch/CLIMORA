import React from 'react';
import { Link } from 'react-router-dom';
import { MountainSnow, ShieldCheck, Heart, Radio, Activity, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <MountainSnow className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl font-black text-white tracking-wider">
                CLIMORA
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md">
              A comprehensive geotechnical AI and climate-tech platform built for early-warning detection of landslide hazards in vulnerable mountainous ecosystems across India.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational &bull; Climate-Tech Intelligence Platform</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Live Monitoring Dashboard
                </Link>
              </li>
              <li>
                <Link to="/predict" className="hover:text-emerald-400 transition-colors">
                  Risk Prediction Studio
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-emerald-400 transition-colors">
                  Interactive Risk Map
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors">
                  About &amp; Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Geotechnical & Emergency Contacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Emergency &amp; Resources
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>NDMA Emergency Helpline: <b className="text-white font-mono">1078</b></li>
              <li>Disaster Management Cell: <b className="text-white font-mono">1070</b></li>
              <li>Data Sources: IMD, GSI, DEM Copernicus</li>
              <li className="pt-2">
                <span className="inline-block bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[11px] text-slate-300 font-mono">
                  FastAPI REST &bull; XGBoost ML
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} CLIMORA. Landslide Risk Prediction &amp; Early Warning Platform.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-slate-400 transition-colors">
              Geotechnical Methodology
            </Link>
            <span>&bull;</span>
            <Link to="/predict" className="hover:text-slate-400 transition-colors">
              Risk Calibration
            </Link>
            <span>&bull;</span>
            <span className="text-emerald-400 font-medium">Predict Risk. Protect Lives.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
