import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  Edit3,
  MapPin,
  Compass,
  AlertOctagon,
  FileText,
  UserCheck,
  Lock,
  Info,
  X,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReports, updateReportStatus } from '../services/communityReportService';

const STATUS_TABS = ['ALL', 'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED'];

export default function AuthorityDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedStatusTab, setSelectedStatusTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Modal for status update
  const [activeModalReport, setActiveModalReport] = useState(null);
  const [newStatus, setNewStatus] = useState('VERIFIED');
  const [authorityNotes, setAuthorityNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [reviewerName, setReviewerName] = useState('District Disaster Management Officer');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReports({
        status: selectedStatusTab !== 'ALL' ? selectedStatusTab : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setReports(res.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports for authority triage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStatusTab, severityFilter]);

  const handleOpenStatusModal = (report) => {
    setActiveModalReport(report);
    setNewStatus(report.verification_status === 'UNVERIFIED' ? 'UNDER_REVIEW' : report.verification_status);
    setAuthorityNotes(report.authority_notes || '');
    setActionTaken(report.action_taken || '');
    setUpdateSuccessMsg(null);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!activeModalReport) return;

    setIsUpdating(true);
    try {
      const payload = {
        status: newStatus,
        authority_notes: authorityNotes.trim() || null,
        action_taken: actionTaken.trim() || null,
        reviewer_name: reviewerName.trim() || 'Emergency Operations Officer',
      };

      const updated = await updateReportStatus(activeModalReport.id, payload);

      // Update in local state
      setReports((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setUpdateSuccessMsg(`Report #${updated.id} status updated to ${updated.verification_status}`);
      setTimeout(() => {
        setActiveModalReport(null);
        setUpdateSuccessMsg(null);
      }, 1200);
    } catch (err) {
      alert(err.message || 'Failed to update report verification status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Metrics calculation
  const totalCount = reports.length;
  const unverifiedCount = reports.filter((r) => r.verification_status === 'UNVERIFIED').length;
  const underReviewCount = reports.filter((r) => r.verification_status === 'UNDER_REVIEW').length;
  const verifiedRoadBlocks = reports.filter(
    (r) => r.verification_status === 'VERIFIED' && r.incident_type === 'ROAD_BLOCKAGE'
  ).length;
  const criticalCount = reports.filter(
    (r) => r.severity === 'CRITICAL' && r.verification_status !== 'RESOLVED'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Official Operations &bull; Incident Verification &amp; Road Triage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Authority Incident Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review incoming citizen reports, verify hazard severity, and coordinate road clearance actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Triage Queue</span>
          </button>
        </div>
      </div>

      {/* Development Notice & Protocol Disclaimer */}
      <div className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white flex items-center gap-2">
            <span>Development Authentication Mode</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              AUDIT METADATA ACTIVE
            </span>
          </p>
          <p className="text-slate-400 leading-relaxed">
            This development dashboard demonstrates the verification workflow and status update state machine. Production deployment requires official Government SSO / OAuth2 and Role-Based Access Control (RBAC) with digital credential verification. No fake government accounts are stored.
          </p>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total In Queue</span>
          <div className="text-2xl font-bold text-white font-mono">{totalCount}</div>
          <span className="text-[11px] text-slate-500">Incident reports recorded</span>
        </div>

        <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Requires Review</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{unverifiedCount + underReviewCount}</div>
          <span className="text-[11px] text-amber-400/80">{unverifiedCount} Unverified &bull; {underReviewCount} Under Review</span>
        </div>

        <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Verified Road Blocks</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{verifiedRoadBlocks}</div>
          <span className="text-[11px] text-emerald-400/80">Confirmed carriageway hazards</span>
        </div>

        <div className="bg-slate-900/70 border border-red-500/30 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-red-400">Active Critical Hazards</span>
          <div className="text-2xl font-bold text-red-400 font-mono">{criticalCount}</div>
          <span className="text-[11px] text-red-400/80">Urgent safety attention</span>
        </div>
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                selectedStatusTab === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* REPORTS TRIAGE TABLE */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading incident queue...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl text-center text-xs">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Queue Empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No incident reports match the current filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">ID / Time</th>
                <th className="p-3.5">Incident Type</th>
                <th className="p-3.5">Location &amp; Coordinates</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Reporter</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono">
                    <span className="text-emerald-400 font-bold">#{report.id}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-white block">
                      {report.incident_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                      {report.description}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <div className="flex items-center gap-1 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{report.road_name || report.location_name || 'Coordinate point'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      report.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      report.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      report.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {report.severity}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                      report.verification_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      report.verification_status === 'UNDER_REVIEW' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                      report.verification_status === 'RESOLVED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {report.verification_status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                      {report.verification_status === 'UNVERIFIED' && <AlertTriangle className="w-3 h-3" />}
                      {report.verification_status}
                    </span>
                  </td>

                  <td className="p-3.5 text-[11px] text-slate-400">
                    <div>{report.reporter_name || 'Anonymous'}</div>
                    <div className="text-[10px] text-slate-500">{report.reporter_role.replace('_', ' ')}</div>
                  </td>

                  <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenStatusModal(report)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold transition-all text-xs shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Review / Triage</span>
                    </button>

                    <Link
                      to={`/map?lat=${report.latitude}&lon=${report.longitude}&rep=${report.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs"
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STATUS UPDATE MODAL */}
      {activeModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                  <span>Authority Verification Assessment</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Report ID: <span className="font-mono text-emerald-400">#{activeModalReport.id}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveModalReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateSuccessMsg ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-xs text-emerald-300 font-semibold">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                {updateSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSaveStatus} className="space-y-4">
                {/* Status selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Update Verification Status *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'UNVERIFIED', label: 'Unverified', color: 'border-amber-500/40 text-amber-400' },
                      { id: 'UNDER_REVIEW', label: 'Under Review', color: 'border-blue-500/40 text-blue-400' },
                      { id: 'VERIFIED', label: 'Verified', color: 'border-emerald-500/40 text-emerald-400' },
                      { id: 'RESOLVED', label: 'Resolved', color: 'border-slate-700 text-slate-400' },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setNewStatus(s.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          newStatus === s.id
                            ? `${s.color} bg-slate-800 ring-1 ring-current`
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reviewer name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reviewing Authority / Official Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Authority Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Assessment Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official verification notes, field spotter confirmation, or risk advisory..."
                    value={authorityNotes}
                    onChange={(e) => setAuthorityNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Action Taken */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dispatched Response / Action Taken
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Earthmover dispatched; road diverted via NH-310A; clearance underway"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModalReport(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-glow-emerald disabled:opacity-60"
                  >
                    {isUpdating ? 'Saving Update...' : 'Commit Status Change'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
