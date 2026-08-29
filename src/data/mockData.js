/**
 * CLIMORA - Central Mock & Reference Data
 * 
 * Standard 4-Tier Risk Classification:
 * - LOW (0% - 29%)
 * - MODERATE (30% - 59%)
 * - HIGH (60% - 79%)
 * - CRITICAL (80% - 100%)
 */

export const RISK_LEVELS = {
  'NO RISK': {
    key: 'NO RISK',
    label: 'No Risk',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    hex: '#10B981',
    range: '0% - 15%',
    minProb: 0.0,
    maxProb: 0.15,
    description: 'Geotechnical & weather conditions indicate minimal to no likelihood of slope failure.'
  },
  'NO_RISK': {
    key: 'NO RISK',
    label: 'No Risk',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    hex: '#10B981',
    range: '0% - 15%',
    minProb: 0.0,
    maxProb: 0.15,
    description: 'Geotechnical & weather conditions indicate minimal to no likelihood of slope failure.'
  },
  LOW: {
    key: 'LOW',
    label: 'Low Risk',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    hex: '#10B981',
    range: '16% - 35%',
    minProb: 0.16,
    maxProb: 0.35,
    description: 'Risk is currently low. Baseline environmental conditions.'
  },
  MODERATE: {
    key: 'MODERATE',
    label: 'Moderate Risk',
    color: 'amber',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    hex: '#F59E0B',
    range: '36% - 60%',
    minProb: 0.36,
    maxProb: 0.60,
    description: 'Elevated pore pressure or rainfall accumulation detected. Heightened vigilance advised.'
  },
  HIGH: {
    key: 'HIGH',
    label: 'High Risk',
    color: 'orange',
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400',
    hex: '#F97316',
    range: '61% - 80%',
    minProb: 0.61,
    maxProb: 0.80,
    description: 'Critical saturation & steep terrain parameters detected. Evacuation readiness required.'
  },
  CRITICAL: {
    key: 'CRITICAL',
    label: 'Critical Risk',
    color: 'rose',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    hex: '#EF4444',
    range: '81% - 100%',
    minProb: 0.81,
    maxProb: 1.00,
    description: 'Imminent slope failure conditions identified. Immediate emergency guidance mandatory.'
  }
};

export const SOIL_TYPES = [
  { id: 'clay_loam', name: 'Clayey Loam', cohesion: 'Medium', drainage: 'Poor', riskFactor: 1.2 },
  { id: 'silty_clay', name: 'Silty Clay', cohesion: 'High', drainage: 'Very Poor', riskFactor: 1.35 },
  { id: 'sandy_loam', name: 'Sandy Loam', cohesion: 'Low', drainage: 'Good', riskFactor: 0.9 },
  { id: 'weathered_rock', name: 'Weathered Schist / Granular', cohesion: 'Very Low', drainage: 'Rapid', riskFactor: 1.4 },
  { id: 'gravelly_soil', name: 'Gravelly Debris Soil', cohesion: 'Low', drainage: 'Moderate', riskFactor: 1.15 },
  { id: 'peat_organic', name: 'Organic Peat / Topsoil', cohesion: 'Low', drainage: 'High Water Holding', riskFactor: 1.25 },
];

export const HOTSPOTS = [
  {
    id: 'wayanad-chooralmala',
    name: 'Wayanad (Chooralmala / Meppadi)',
    state: 'Kerala',
    coordinates: [11.5332, 76.1284],
    currentRisk: 'CRITICAL',
    probability: 0.88,
    lastUpdated: '10 mins ago',
    trend: '+12% (Last 6h)',
    rainfall: 186.4, // mm
    soilMoisture: 88.5, // %
    temperature: 21.2, // °C
    slope: 42.0, // degrees
    elevation: 1150, // m
    soilType: 'Weathered Schist / Granular',
    historicalEvents: 6,
    summary: 'Sustained monsoon deluge exceeding 180mm/24h on weathered steep slopes with high pore pressure.'
  },
  {
    id: 'shimla-summerhill',
    name: 'Shimla (Summer Hill / Tutu)',
    state: 'Himachal Pradesh',
    coordinates: [31.1048, 77.1734],
    currentRisk: 'HIGH',
    probability: 0.72,
    lastUpdated: '18 mins ago',
    trend: '+8% (Last 12h)',
    rainfall: 112.0,
    soilMoisture: 74.0,
    temperature: 16.5,
    slope: 36.5,
    elevation: 2205,
    soilType: 'Silty Clay',
    historicalEvents: 4,
    summary: 'Cloudburst remnants with drainage oversaturation along NH-5 road cutting zone.'
  },
  {
    id: 'joshimath-marwari',
    name: 'Joshimath (Marwari Sector)',
    state: 'Uttarakhand',
    coordinates: [30.5574, 79.5668],
    currentRisk: 'HIGH',
    probability: 0.67,
    lastUpdated: '25 mins ago',
    trend: '+3% (Last 24h)',
    rainfall: 68.5,
    soilMoisture: 69.2,
    temperature: 13.0,
    slope: 34.0,
    elevation: 1890,
    soilType: 'Gravelly Debris Soil',
    historicalEvents: 9,
    summary: 'Active ground subsidence zone with shear stress acceleration post-unseasonal rainfall.'
  },
  {
    id: 'munnar-gaproad',
    name: 'Munnar (Gap Road Stretch)',
    state: 'Kerala',
    coordinates: [10.0889, 77.0595],
    currentRisk: 'MODERATE',
    probability: 0.48,
    lastUpdated: '32 mins ago',
    trend: '-4% (Last 6h)',
    rainfall: 44.0,
    soilMoisture: 58.0,
    temperature: 18.8,
    slope: 29.0,
    elevation: 1530,
    soilType: 'Clayey Loam',
    historicalEvents: 3,
    summary: 'Periodic rock spalling under moderate rainfall; vegetation root systems providing partial retention.'
  },
  {
    id: 'darjeeling-mirik',
    name: 'Darjeeling (Mirik Spur)',
    state: 'West Bengal',
    coordinates: [26.8906, 88.1807],
    currentRisk: 'MODERATE',
    probability: 0.42,
    lastUpdated: '45 mins ago',
    trend: '+2% (Last 12h)',
    rainfall: 38.5,
    soilMoisture: 52.0,
    temperature: 15.4,
    slope: 26.5,
    elevation: 1760,
    soilType: 'Silty Clay',
    historicalEvents: 2,
    summary: 'Continuous drizzle saturating topsoil; tea plantation terraces stabilizing upper sub-layers.'
  },
  {
    id: 'dehradun-foothills',
    name: 'Dehradun (Mussoorie Foothills)',
    state: 'Uttarakhand',
    coordinates: [30.3165, 78.0322],
    currentRisk: 'LOW',
    probability: 0.18,
    lastUpdated: '50 mins ago',
    trend: '-6% (Last 24h)',
    rainfall: 12.0,
    soilMoisture: 32.0,
    temperature: 24.5,
    slope: 16.0,
    elevation: 640,
    soilType: 'Sandy Loam',
    historicalEvents: 0,
    summary: 'Stable geological formation with low slope angle and optimal sub-surface drainage.'
  }
];

export const HISTORICAL_HOURLY_TREND = [
  { time: '00:00', risk: 0.32, rainfall: 4.2, moisture: 48 },
  { time: '03:00', risk: 0.35, rainfall: 8.5, moisture: 51 },
  { time: '06:00', risk: 0.44, rainfall: 18.0, moisture: 58 },
  { time: '09:00', risk: 0.58, rainfall: 32.4, moisture: 67 },
  { time: '12:00', risk: 0.73, rainfall: 54.0, moisture: 78 },
  { time: '15:00', risk: 0.84, rainfall: 78.5, moisture: 85 },
  { time: '18:00', risk: 0.88, rainfall: 92.0, moisture: 89 },
  { time: '21:00', risk: 0.85, rainfall: 42.0, moisture: 87 },
  { time: 'Now', risk: 0.82, rainfall: 28.0, moisture: 86 },
];

export const SEVEN_DAY_FORECAST = [
  { day: 'Mon', risk: 0.28, rainfall: 14, label: 'LOW' },
  { day: 'Tue', risk: 0.35, rainfall: 22, label: 'MODERATE' },
  { day: 'Wed', risk: 0.52, rainfall: 48, label: 'MODERATE' },
  { day: 'Thu', risk: 0.78, rainfall: 120, label: 'HIGH' },
  { day: 'Fri (Peak)', risk: 0.89, rainfall: 165, label: 'CRITICAL' },
  { day: 'Sat', risk: 0.71, rainfall: 80, label: 'HIGH' },
  { day: 'Sun', risk: 0.45, rainfall: 30, label: 'MODERATE' },
];

export const ACTIVE_EARLY_WARNINGS = [
  {
    id: 'w-1',
    severity: 'CRITICAL',
    title: 'Severe Rainfall Threshold Exceeded',
    message: '24h rainfall exceeded 180mm in Wayanad watershed. Pore pressure exceeds 45 kPa limit.',
    region: 'Wayanad (Chooralmala), Kerala',
    timestamp: '12 minutes ago',
    trigger: 'Cumulative Precipitation > 150mm & Slope > 35°'
  },
  {
    id: 'w-2',
    severity: 'HIGH',
    title: 'Soil Saturation Critical Peak',
    message: 'Sub-surface soil moisture sensors reporting 88% saturation across Summer Hill fault line.',
    region: 'Shimla, Himachal Pradesh',
    timestamp: '34 minutes ago',
    trigger: 'Soil Moisture Saturation > 75%'
  },
  {
    id: 'w-3',
    severity: 'MODERATE',
    title: 'Elevated Slope Displacement Micro-Creep',
    message: 'Geodetic tiltmeters registered 4.2mm shear displacement over the past 12 hours.',
    region: 'Joshimath (Sector 4), Uttarakhand',
    timestamp: '1 hour ago',
    trigger: 'Creep Velocity > 0.3 mm/hr'
  }
];

export const RECOMMENDED_ACTIONS = {
  'NO RISK': {
    category: 'NO RISK',
    title: 'Normal Monitoring Protocol',
    badgeColor: 'emerald',
    primaryAction: 'No significant landslide risk is indicated by the current model prediction. Continue normal monitoring.',
    checklist: [
      'Maintain standard automated sensor polling (30-minute intervals).',
      'Verify clearing of natural hillside drainage channels.',
      'Allow regular vehicular traffic and routine activities.',
      'Log weather forecast updates from regional meteorological agencies.'
    ],
    authorityGuidance: 'No alert required. Continue baseline operations.',
    leadTime: 'Routine'
  },
  'NO_RISK': {
    category: 'NO RISK',
    title: 'Normal Monitoring Protocol',
    badgeColor: 'emerald',
    primaryAction: 'No significant landslide risk is indicated by the current model prediction. Continue normal monitoring.',
    checklist: [
      'Maintain standard automated sensor polling (30-minute intervals).',
      'Verify clearing of natural hillside drainage channels.',
      'Allow regular vehicular traffic and routine activities.',
      'Log weather forecast updates from regional meteorological agencies.'
    ],
    authorityGuidance: 'No alert required. Continue baseline operations.',
    leadTime: 'Routine'
  },
  LOW: {
    category: 'LOW',
    title: 'Routine Environmental Monitoring',
    badgeColor: 'emerald',
    primaryAction: 'Risk is currently low. Continue monitoring environmental conditions.',
    checklist: [
      'Maintain standard automated sensor polling (30-minute intervals).',
      'Verify clearing of culverts and natural hillside drainage channels.',
      'Allow regular vehicular traffic and routine agricultural activities.',
      'Log weather forecast updates from regional meteorological agencies.'
    ],
    authorityGuidance: 'No immediate alert required. Normal operations permitted.',
    leadTime: 'Routine'
  },
  MODERATE: {
    category: 'MODERATE',
    title: 'Precautionary Advisory & Heightened Alert',
    badgeColor: 'amber',
    primaryAction: 'Risk is moderate. Increase monitoring, particularly during heavy rainfall.',
    checklist: [
      'Switch telemetry sensors to rapid-polling mode (5-minute intervals).',
      'Inspect vulnerable slopes and road embankments for tension cracks.',
      'Advise motorists to exercise extreme caution on hairpin bends during night hours.',
      'Establish direct communication with local Disaster Management Authorities (DDMA).'
    ],
    authorityGuidance: 'Issue Yellow Advisory to mountain transport operators and local panchayats.',
    leadTime: '12 - 24 Hours Lead Time'
  },
  HIGH: {
    category: 'HIGH',
    title: 'Evacuation Readiness & Route Pre-Alert',
    badgeColor: 'orange',
    primaryAction: 'Risk is high. Increase monitoring and prepare appropriate emergency response measures.',
    checklist: [
      'Activate municipal emergency operations center (EOC).',
      'Identify and notify vulnerable households located on downstream debris paths.',
      'Pre-position heavy earthmoving equipment and rescue personnel at strategic junctions.',
      'Enforce night-time vehicle travel bans on landslide-prone mountain passes.'
    ],
    authorityGuidance: 'Issue Orange Warning. Voluntary evacuation recommended for elderly & children.',
    leadTime: '4 - 12 Hours Lead Time'
  },
  CRITICAL: {
    category: 'CRITICAL',
    title: 'Mandatory Evacuation & Emergency Protocol',
    badgeColor: 'rose',
    primaryAction: 'Risk is critical. Follow official disaster-management and evacuation guidance immediately.',
    checklist: [
      'Trigger loud siren & SMS broadcast alerts to all geo-fenced mobile users in the sector.',
      'Evacuate population to designated cyclone/landslide relief shelters on stable bedrock.',
      'Complete road closures for all non-emergency vehicles across the affected pass.',
      'Deploy State Disaster Response Force (SDRF) and National Disaster Response Force (NDRF).'
    ],
    authorityGuidance: 'Red Alert Protocol Active. Immediate emergency action enforced by District Magistrate.',
    leadTime: 'Immediate (< 2 Hours)'
  }
};

export const PRESET_PROFILES = [
  {
    id: 'preset-wayanad',
    title: 'Wayanad Monsoon Catastrophe (Critical)',
    locationName: 'Wayanad, Western Ghats',
    data: {
      // Location
      latitude: 11.5332,
      longitude: 76.1284,
      stateRegion: 'Kerala',
      // Terrain
      elevation: 1180,
      slope: 42.5,
      aspect: 225,
      curvature: 0.8,
      // Environment
      rainfall: 188.5,
      soilMoisture: 89.0,
      temperature: 21.0,
      humidity: 94.0,
      // Land / Context
      landCover: 'Forest',
      // Historical (prototype demo values)
      historicalLandslideCount: 6,
      daysSincePreviousEvent: 180,
    }
  },
  {
    id: 'preset-shimla',
    title: 'Shimla Flash Cloudburst (High)',
    locationName: 'Shimla, Himachal Pradesh',
    data: {
      // Location
      latitude: 31.1048,
      longitude: 77.1734,
      stateRegion: 'Himachal Pradesh',
      // Terrain
      elevation: 2200,
      slope: 37.0,
      aspect: 180,
      curvature: 0.4,
      // Environment
      rainfall: 115.0,
      soilMoisture: 75.0,
      temperature: 16.0,
      humidity: 85.0,
      // Land / Context
      landCover: 'Shrubland',
      // Historical (prototype demo values)
      historicalLandslideCount: 4,
      daysSincePreviousEvent: 320,
    }
  },
  {
    id: 'preset-munnar',
    title: 'Munnar Tea Slopes (Moderate)',
    locationName: 'Munnar, Kerala',
    data: {
      // Location
      latitude: 10.0889,
      longitude: 77.0595,
      stateRegion: 'Kerala',
      // Terrain
      elevation: 1540,
      slope: 28.0,
      aspect: 135,
      curvature: 0.2,
      // Environment
      rainfall: 45.0,
      soilMoisture: 56.0,
      temperature: 19.5,
      humidity: 72.0,
      // Land / Context
      landCover: 'Cropland',
      // Historical (prototype demo values)
      historicalLandslideCount: 3,
      daysSincePreviousEvent: 540,
    }
  },
  {
    id: 'preset-dehradun',
    title: 'Dehradun Valley Baseline (Low)',
    locationName: 'Dehradun Foothills, Uttarakhand',
    data: {
      // Location
      latitude: 30.3165,
      longitude: 78.0322,
      stateRegion: 'Uttarakhand',
      // Terrain
      elevation: 640,
      slope: 14.0,
      aspect: 90,
      curvature: 0.05,
      // Environment
      rainfall: 10.0,
      soilMoisture: 30.0,
      temperature: 25.0,
      humidity: 55.0,
      // Land / Context
      landCover: 'Grassland',
      // Historical (prototype demo values)
      historicalLandslideCount: 0,
      daysSincePreviousEvent: 1200,
    }
  }
];
