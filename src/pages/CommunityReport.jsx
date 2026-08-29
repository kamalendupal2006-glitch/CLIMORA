import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Video,
  UploadCloud,
  CheckCircle2,
  ShieldAlert,
  Compass,
  ArrowRight,
  Info,
  Navigation,
  FileText,
  User,
  Phone,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestCurrentPosition, formatAccuracy } from '../services/gpsService';
import { createReport, uploadMedia } from '../services/communityReportService';

const INCIDENT_TYPES = [
  { id: 'ROAD_BLOCKAGE', label: 'Road Blockage', desc: 'Debris, tree fall, or mud covering carriageway', icon: AlertOctagon, color: 'text-amber-400' },
  { id: 'LANDSLIDE', label: 'Active Landslide', desc: 'Active slope failure or debris flow', icon: AlertTriangle, color: 'text-red-400' },
  { id: 'ROCKFALL', label: 'Rockfall', desc: 'Boulders or detached rock mass falling onto road/habitation', icon: AlertTriangle, color: 'text-orange-400' },
  { id: 'SLOPE_CRACK', label: 'Slope Crack', desc: 'Ground tension cracks or subsidence on hillside', icon: Info, color: 'text-yellow-400' },
  { id: 'SOIL_MOVEMENT', label: 'Soil Movement / Creep', desc: 'Tilting trees, retaining wall movement, slow shift', icon: Compass, color: 'text-teal-400' },
  { id: 'FLOOD', label: 'Flood / Flash Flood', desc: 'Stream overflow, inundation, or culvert blockage', icon: ShieldAlert, color: 'text-cyan-400' },
  { id: 'INFRASTRUCTURE_DAMAGE', label: 'Damaged Infrastructure', desc: 'Compromised retaining wall, bridge, or culvert', icon: AlertOctagon, color: 'text-purple-400' },
  { id: 'OTHER', label: 'Other Hazard Observation', desc: 'Other disaster-related terrain hazard', icon: Info, color: 'text-slate-400' },
];

const SEVERITY_LEVELS = [
  { id: 'LOW', label: 'Low', desc: 'Minor debris or surface cracking. Traffic/habitations unaffected.', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { id: 'MEDIUM', label: 'Medium', desc: 'Partial lane obstruction or noticeable slope movement. Caution advised.', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
  { id: 'HIGH', label: 'High', desc: 'Full road obstruction, active rockfall, or threat to nearby structures.', color: 'border-orange-500/30 text-orange-400 bg-orange-500/10' },
  { id: 'CRITICAL', label: 'Critical', desc: 'Severe landslide, structural collapse, or immediate safety hazard.', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
];

const ROLES = [
  { id: 'CITIZEN', label: 'Citizen Observer' },
  { id: 'LOCAL_RESIDENT', label: 'Local Village / Town Resident' },
  { id: 'COMMUTER', label: 'Commuter / Driver' },
  { id: 'COMMUNITY_VOLUNTEER', label: 'Community Volunteer / Spotter' },
  { id: 'EMERGENCY_RESPONDER', label: 'Emergency First Responder / PWD' },
  { id: 'ANONYMOUS', label: 'Anonymous Reporter' },
];

export default function CommunityReport() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(null);

  const [incidentType, setIncidentType] = useState('ROAD_BLOCKAGE');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [roadName, setRoadName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterRole, setReporterRole] = useState('CITIZEN');
  const [contactInfo, setContactInfo] = useState('');

  // Media
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);

  const handleGpsFetch = async () => {
    setGpsLoading(true);
    setGpsWarning(null);
    setSubmitError(null);
    try {
      const { position, warning } = await requestCurrentPosition();
      setLatitude(position.latitude.toFixed(5));
      setLongitude(position.longitude.toFixed(5));
      setGpsAccuracy(position.accuracy);
      if (warning) setGpsWarning(warning);
    } catch (err) {
      setSubmitError(err.message || 'Unable to access device GPS.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('Video file must be smaller than 25 MB.');
      return;
    }
    setVideoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setSubmitError('Please provide a valid latitude between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setSubmitError('Please provide a valid longitude between -180 and 180.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setSubmitError('Please provide a short description (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = null;
      let videoUrl = null;

      // Upload photo if present
      if (photoFile) {
        setUploadingMedia(true);
        const uploaded = await uploadMedia(photoFile);
        photoUrl = uploaded.url;
      }

      // Upload video if present
      if (videoFile) {
        setUploadingMedia(true);
        const uploadedVid = await uploadMedia(videoFile);
        videoUrl = uploadedVid.url;
      }

      const payload = {
        latitude: latNum,
        longitude: lonNum,
        incident_type: incidentType,
        severity: severity,
        description: description.trim(),
        road_name: roadName.trim() || null,
        location_name: locationName.trim() || null,
        photo_url: photoUrl,
        video_url: videoUrl,
        reporter_name: reporterName.trim() || null,
        reporter_role: reporterRole,
        contact_info: contactInfo.trim() || null,
      };

      const result = await createReport(payload);
      setSubmittedReport(result);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit report. Please check server connection.');
    } finally {
      setIsSubmitting(false);
      setUploadingMedia(false);
    }
  };

  const resetForm = () => {
    setSubmittedReport(null);
    setDescription('');
    setRoadName('');
    setLocationName('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setVideoFile(null);
    setSubmitError(null);
  };

  if (submittedReport) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-fadeIn">
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              STATUS: UNVERIFIED CITIZEN REPORT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Incident Report Submitted
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              Your report has been broadcast to nearby community feeds and placed in the district triage queue for review.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left text-xs sm:text-sm space-y-3 font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Report Tracking ID:</span>
              <span className="text-emerald-400 font-bold">{submittedReport.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Incident Type:</span>
              <span className="text-white font-bold">{submittedReport.incident_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Coordinates:</span>
              <span className="text-white">{submittedReport.latitude.toFixed(4)}°N, {submittedReport.longitude.toFixed(4)}°E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verification Status:</span>
              <span className="text-amber-400 font-bold">UNVERIFIED (Pending Authority Review)</span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left flex items-start gap-3 text-xs text-amber-300/90">
            <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Integrity Notice:</strong> CLIMORA labels all citizen reports as UNVERIFIED until official verification by emergency management officers. For active emergencies requiring immediate rescue, call <strong>112</strong> or State Disaster Management (<strong>1070</strong>).
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              to="/map"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all text-xs sm:text-sm shadow-glow-emerald"
            >
              <Compass className="w-4 h-4" />
              <span>View On Hazard Map</span>
            </Link>

            <Link
              to="/reports"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-all text-xs sm:text-sm border border-slate-700"
            >
              <span>View Community Feed</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <AlertOctagon className="w-4 h-4" />
          <span>Community Disaster Surveillance &bull; Citizen Reporting</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Report Hazard or Road Blockage
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Report on-ground observations of landslides, road blockages, rockfalls, slope cracks, or flash floods across mountain transit corridors.
        </p>
      </div>

      {/* Safety Protocol Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-300">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Verification Protocol & Emergency Assistance
          </p>
          <p className="text-slate-400 leading-relaxed">
            All submitted reports are published to the community feed with an <span className="text-amber-400 font-semibold font-mono">UNVERIFIED</span> status until vetted by district disaster authorities. Never put yourself in danger to take photos or record observations.
          </p>
        </div>
      </div>

      {/* Error notification */}
      {submitError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{submitError}</span>
          </div>
          <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-white font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: GEOLOCATION */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>1. Incident Location (GPS)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acquire device coordinates or manually input latitude and longitude.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGpsFetch}
              disabled={gpsLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 transition-all shadow-glow-emerald disabled:opacity-60"
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Detecting Location...' : 'Use My GPS Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Latitude (WGS84) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 27.3389"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Longitude (WGS84) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 88.6065"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {gpsAccuracy && (
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>GPS lock acquired: {formatAccuracy(gpsAccuracy)}</span>
            </div>
          )}

          {gpsWarning && (
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>{gpsWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Road / Highway Name (if known)
              </label>
              <input
                type="text"
                placeholder="e.g. NH-10 near Teesta Bridge / Gangtok-Nathula Rd"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Village / Landmark / District
              </label>
              <input
                type="text"
                placeholder="e.g. Near Rangpo / Mangan Sub-Division"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* STEP 2: INCIDENT TYPE */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <span>2. Type of Observation *</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select the primary hazard or obstruction type observed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {INCIDENT_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = incidentType === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setIncidentType(t.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500 shadow-glow-emerald'
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span className="text-xs font-bold text-white">{t.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: SEVERITY LEVEL */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>3. Observed Severity *</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Assess the scale of obstruction and immediate transit hazard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SEVERITY_LEVELS.map((s) => {
              const isSelected = severity === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? `${s.color} ring-1 ring-current shadow-sm`
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1">
                    {s.label}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 4: DESCRIPTION & MEDIA */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>4. Description &amp; Photo Evidence</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Provide context regarding current road passability, weather conditions, or estimated debris volume.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Incident Description *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe the condition (e.g. 'Both lanes blocked by rockfall approximately 2km past checkpost. Mud continues to slide from upper ridge. Light vehicles turning back.')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Photo upload */}
            <div className="border border-dashed border-slate-800 rounded-2xl p-4 text-center bg-slate-950/50 hover:bg-slate-950 transition-all">
              <label className="cursor-pointer block space-y-2">
                <Camera className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-xs font-semibold text-white">
                  {photoFile ? photoFile.name : 'Upload Photo'}
                </div>
                <p className="text-[10px] text-slate-400">
                  JPG, PNG, WebP (Max 25 MB)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              {photoPreview && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-800">
                  <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-slate-950/80 text-white p-1 rounded-md text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Video upload */}
            <div className="border border-dashed border-slate-800 rounded-2xl p-4 text-center bg-slate-950/50 hover:bg-slate-950 transition-all">
              <label className="cursor-pointer block space-y-2">
                <Video className="w-6 h-6 text-teal-400 mx-auto" />
                <div className="text-xs font-semibold text-white">
                  {videoFile ? videoFile.name : 'Upload Video (Optional)'}
                </div>
                <p className="text-[10px] text-slate-400">
                  MP4, MOV (Max 25 MB)
                </p>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </label>

              {videoFile && (
                <div className="mt-3 text-xs text-emerald-400 font-mono flex items-center justify-between bg-slate-900 p-2 rounded-lg">
                  <span>{videoFile.name} ({(videoFile.size / (1024*1024)).toFixed(1)} MB)</span>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-red-400 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 5: REPORTER DETAILS */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>5. Reporter Information</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Role helps emergency services understand observation context. Names may be kept anonymous.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reporter Role
              </label>
              <select
                value={reporterRole}
                onChange={(e) => setReporterRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reporter Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for Anonymous"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contact Phone / Email (Optional)
              </label>
              <input
                type="text"
                placeholder="For emergency triage contact"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Submission will be assigned status <strong>UNVERIFIED</strong>.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 transition-all duration-200 hover:scale-[1.02] shadow-glow-emerald disabled:opacity-60 text-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{uploadingMedia ? 'Uploading Media...' : 'Recording Incident...'}</span>
              </>
            ) : (
              <>
                <span>SUBMIT HAZARD REPORT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
