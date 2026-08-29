import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RISK_LEVELS } from '../data/mockData';
import { ExternalLink, Layers, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';

// Custom SVG Icon creator for Leaflet
function createCustomIcon(level = 'CRITICAL') {
  const config = RISK_LEVELS[level] || RISK_LEVELS.LOW;
  
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full pulse-ring-${level.toLowerCase()}"></div>
        <div class="relative w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center" style="background-color: ${config.hex};">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function ChangeMapView({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length === 2) {
      map.setView(coords, 12, { animate: true });
    }
  }, [coords, map]);
  return null;
}

export default function MapPreview({
  coordinates = [11.5332, 76.1284],
  locationName = 'Wayanad (Chooralmala)',
  category = 'CRITICAL',
  probability = 0.88,
  rainfall = 186.4,
  slope = 42.0,
}) {
  const normCategory = (category || 'LOW').toUpperCase();
  const config = RISK_LEVELS[normCategory] || RISK_LEVELS.LOW;
  const markerIcon = createCustomIcon(normCategory);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Geospatial Radar</span>
          </div>
          <h3 className="text-lg font-bold text-white">Spatial Risk Visualization</h3>
        </div>

        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-all"
        >
          <span>Full Map</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-800 z-0">
        <MapContainer
          center={coordinates}
          zoom={12}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <ChangeMapView coords={coordinates} />
          
          {/* Dark / Topographic CartoDB / OSM Base Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <Circle
            center={coordinates}
            radius={2500}
            pathOptions={{
              color: config.hex,
              fillColor: config.hex,
              fillOpacity: 0.18,
              weight: 1.5,
              dashArray: '4 4',
            }}
          />

          <Marker position={coordinates} icon={markerIcon}>
            <Popup>
              <div className="p-1 space-y-1.5 text-slate-900">
                <div className="font-bold text-sm text-slate-900">{locationName}</div>
                <div className="text-xs font-medium flex items-center justify-between gap-3">
                  <span className="text-slate-600">Risk Level:</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded text-[11px] text-white"
                    style={{ backgroundColor: config.hex }}
                  >
                    {normCategory} ({Math.round(probability * 100)}%)
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  <div>Rainfall: <b>{rainfall} mm</b></div>
                  <div>Slope: <b>{slope}°</b></div>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Mini Overlay Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-[11px] space-y-1 shadow-lg pointer-events-none">
          <div className="font-semibold text-white flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>Active Sector Buffer: 2.5 km</span>
          </div>
          <div className="text-slate-400 font-mono text-[10px]">
            LAT: {coordinates[0].toFixed(4)}° | LON: {coordinates[1].toFixed(4)}°
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Cartographic coordinates synced with Digital Elevation Models (DEM).</span>
        <span className="font-mono text-[11px] text-emerald-400">WGS-84</span>
      </div>
    </div>
  );
}
