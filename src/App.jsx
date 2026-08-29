import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Prediction from './pages/Prediction';
import RiskMap from './pages/RiskMap';
import About from './pages/About';
import CommunityReport from './pages/CommunityReport';
import ReportsFeed from './pages/ReportsFeed';
import AuthorityDashboard from './pages/AuthorityDashboard';
import VillageDiscovery from './pages/VillageDiscovery';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="predict" element={<Prediction />} />
          <Route path="map" element={<RiskMap />} />
          <Route path="report" element={<CommunityReport />} />
          <Route path="reports" element={<ReportsFeed />} />
          <Route path="villages" element={<VillageDiscovery />} />
          <Route path="authority" element={<AuthorityDashboard />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
