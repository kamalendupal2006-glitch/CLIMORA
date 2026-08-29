import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  MountainSnow,
  Activity,
  ShieldAlert,
  Map,
  Info,
  Menu,
  X,
  ArrowRight,
  AlertOctagon,
  Building,
  UserCheck,
  Plus,
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Risk Prediction', path: '/predict' },
    { name: 'Hazard Map', path: '/map' },
    { name: 'Community Reports', path: '/reports' },
    { name: 'Remote Villages', path: '/villages' },
    { name: 'Authority Console', path: '/authority' },
    { name: 'About', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-glow-emerald flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <MountainSnow className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
                  CLIMORA
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-widest font-mono">
                  EARLY WARNING
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight hidden sm:block">
                Landslide Early Warning &amp; Disaster Monitoring
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-glow-emerald'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Action CTA & Quick Report */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Report Hazard</span>
            </Link>

            <Link
              to="/predict"
              className="relative inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-glow-emerald transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>CHECK RISK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex xl:hidden items-center gap-2">
            <Link
              to="/report"
              className="px-2.5 py-1 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-lg"
            >
              REPORT
            </Link>
            <Link
              to="/predict"
              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-emerald-400 rounded-lg shadow-sm"
            >
              CHECK RISK
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-6 space-y-2 animate-fadeIn">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>REPORT INCIDENT / ROAD BLOCKAGE</span>
            </Link>

            <Link
              to="/predict"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300"
            >
              <span>CHECK LANDSLIDE RISK</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
