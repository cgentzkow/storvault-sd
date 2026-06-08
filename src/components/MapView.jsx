import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import PropertyDrawer from './PropertyDrawer.jsx'
import PropertyDetail from './PropertyDetail.jsx'
import { db } from '../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import MapControls from './MapControls.jsx'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'
const PARCEL_URL = 'https://gis-public.sandiegocounty.gov/arcgis/rest/services/Lots/MapServer/export'
const PARCEL_LAYERS = encodeURIComponent(JSON.stringify([{
  id: 0, source: { type: 'mapLayer', mapLayerId: 0 },
  drawingInfo: { renderer: { type: 'simple', symbol: {
    type: 'esriSFS', style: 'esriSFSNull',
    outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [255, 235, 59, 255], width: 1.5 }
  }}}
}]))

const STATUS_COLORS = {
  not_called: '#60a5fa', called: '#34d399', interested: '#f59e0b',
  not_interested: '#94a3b8', under_nda: '#a78bfa', listed: '#f87171',
}

// ── ZONE INFO DATABASE ────────────────────────────────────────────────────────
const ZONE_INFO = {
  'IL': { label: 'Industrial Light', status: 'by_right', detail: 'Storage allowed by right' },
  'IL-1-1': { label: 'Industrial Light', status: 'by_right', detail: 'Storage allowed by right' },
  'IL-2-1': { label: 'Industrial Light', status: 'by_right', detail: 'Storage allowed by right' },
  'IL-3-1': { label: 'Industrial Light', status: 'by_right', detail: 'Storage allowed by right' },
  'IH-1-1': { label: 'Industrial Heavy', status: 'by_right', detail: 'Storage allowed by right' },
  'IH-2-1': { label: 'Industrial Heavy', status: 'by_right', detail: 'Storage allowed by right' },
  'IBT-1-1': { label: 'Industrial Business & Technology', status: 'by_right', detail: 'Storage allowed by right' },
  'IG': { label: 'Industrial General', status: 'by_right', detail: 'Storage allowed by right' },
  'IP': { label: 'Industrial Park', status: 'by_right', detail: 'Storage allowed by right' },
  'ILP': { label: 'Industrial Light Park', status: 'by_right', detail: 'Storage allowed by right' },
  'IRL': { label: 'Industrial Research/Light', status: 'by_right', detail: 'Storage allowed by right' },
  'I': { label: 'Industrial', status: 'by_right', detail: 'Storage allowed by right' },
  'CC-4-2': { label: 'Community Commercial (CC-4)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-4-3': { label: 'Community Commercial (CC-4)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-4-5': { label: 'Community Commercial (CC-4)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-4-6': { label: 'Community Commercial (CC-4)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-5-1': { label: 'Community Commercial (CC-5)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-5-2': { label: 'Community Commercial (CC-5)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-5-3': { label: 'Community Commercial (CC-5)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-5-4': { label: 'Community Commercial (CC-5)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CC-5-5': { label: 'Community Commercial (CC-5)', status: 'by_right', detail: 'Storage allowed by right in mixed-use development' },
  'CR-1-1': { label: 'Commercial Recreation', status: 'by_right', detail: 'Storage allowed by right' },
  'CR-2-1': { label: 'Commercial Recreation', status: 'by_right', detail: 'Storage allowed by right' },
  'M50': { label: 'General Industrial (M50)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'M52': { label: 'General Industrial (M52)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'M54': { label: 'General Industrial (M54)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'M58': { label: 'General Industrial (M58)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'C36': { label: 'General Commercial (C36)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'C37': { label: 'General Commercial (C37)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'C38': { label: 'General Commercial (C38)', status: 'by_right', detail: 'County unincorporated — storage allowed by right' },
  'CG': { label: 'General Commercial (CG)', status: 'by_right', detail: 'Storage allowed by right' },
  'C-2': { label: 'Commercial (C-2)', status: 'by_right', detail: 'Storage allowed by right' },
  'CC-1-1': { label: 'Community Commercial (CC-1)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-1-2': { label: 'Community Commercial (CC-1)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-1-3': { label: 'Community Commercial (CC-1)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-2-1': { label: 'Community Commercial (CC-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-2-2': { label: 'Community Commercial (CC-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-2-3': { label: 'Community Commercial (CC-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-2-4': { label: 'Community Commercial (CC-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-2-5': { label: 'Community Commercial (CC-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-4': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-5': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-6': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-7': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-8': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-9': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-10': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC-3-11': { label: 'Community Commercial (CC-3)', status: 'banned', detail: 'Self-storage not permitted' },
  'CCD': { label: 'Commercial Core Downtown', status: 'banned', detail: 'Self-storage not permitted' },
  'CCP': { label: 'Commercial Core Park', status: 'banned', detail: 'Self-storage not permitted' },
  'CN': { label: 'Commercial Neighborhood', status: 'banned', detail: 'Self-storage not permitted' },
  'CNP': { label: 'Commercial Neighborhood Pedestrian', status: 'banned', detail: 'Self-storage not permitted' },
  'CV': { label: 'Commercial Visitor', status: 'banned', detail: 'Self-storage not permitted' },
  'CP': { label: 'Commercial Park', status: 'banned', detail: 'Self-storage not permitted' },
  'CTP': { label: 'Commercial Transit Pedestrian', status: 'banned', detail: 'Self-storage not permitted' },
  'C-1': { label: 'General Commercial (C-1)', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-1-1': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-1-2': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-2-1': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-2-2': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-3-1': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-3-2': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'CO-3-3': { label: 'Commercial Office', status: 'banned', detail: 'Self-storage not permitted' },
  'IP-1-1': { label: 'Industrial Park (IP-1)', status: 'banned', detail: 'Self-storage not permitted in IP zone' },
  'IP-2-1': { label: 'Industrial Park (IP-2)', status: 'banned', detail: 'Self-storage not permitted in IP zone' },
  'IP-3-1': { label: 'Industrial Park (IP-3)', status: 'banned', detail: 'Self-storage not permitted in IP zone' },
  'C30': { label: 'Community Commercial (C30)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C31': { label: 'Community Commercial (C31)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C32': { label: 'Community Commercial (C32)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C34': { label: 'Community Commercial (C34)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C35': { label: 'Community Commercial (C35)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C40': { label: 'Office Commercial (C40)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C42': { label: 'Office Commercial (C42)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C44': { label: 'Office Commercial (C44)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C46': { label: 'Office Commercial (C46)', status: 'banned', detail: 'County — self-storage not permitted' },
  'C1': { label: 'Commercial (C1)', status: 'banned', detail: 'Self-storage not permitted' },
  'C2': { label: 'Commercial (C2)', status: 'banned', detail: 'Self-storage not permitted' },
  'CC': { label: 'Community Commercial (CC)', status: 'banned', detail: 'Self-storage not permitted' },
  'CL': { label: 'Commercial Limited (CL)', status: 'banned', detail: 'Self-storage not permitted' },
  'M-2': { label: 'Heavy Industrial (M-2)', status: 'banned', detail: 'Self-storage not permitted' },
  'I-P': { label: 'Industrial Park (I-P)', status: 'banned', detail: 'Self-storage not permitted' },
  'I-P-O': { label: 'Industrial Park Overlay (I-P-O)', status: 'banned', detail: 'Self-storage not permitted' },
  'B-P': { label: 'Business Park (B-P)', status: 'banned', detail: 'Self-storage not permitted' },
  'M-1': { label: 'Light Industrial (M-1)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'M-1/M-2': { label: 'Light/Heavy Industrial (M-1/M-2)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'M': { label: 'Manufacturing (M)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'C-M': { label: 'Commercial-Manufacturing (C-M)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'M1': { label: 'Light Manufacturing (M1)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'L-I': { label: 'Light Industrial (L-I)', status: 'cup', detail: 'Conditional use permit required for self-storage' },
  'CUPD-CU-1-1': { label: 'Corridor Urban (CU-1)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-1-2': { label: 'Corridor Urban (CU-1)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-2-3': { label: 'Corridor Urban (CU-2)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-2-4': { label: 'Corridor Urban (CU-2)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-2-5': { label: 'Corridor Urban (CU-2)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-3-3': { label: 'Corridor Urban (CU-3)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-3-6': { label: 'Corridor Urban (CU-3)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-3-7': { label: 'Corridor Urban (CU-3)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CU-3-8': { label: 'Corridor Urban (CU-3)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CT-2-3': { label: 'Corridor Transit (CT-2)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CT-2-4': { label: 'Corridor Transit (CT-2)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CT-3-3': { label: 'Corridor Transit (CT-3)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'CUPD-CT-5-4': { label: 'Corridor Transit (CT-5)', status: 'pending_ban', detail: 'Storage grandfathered — new CUP required; ban expected 2026' },
  'Industrial Employment': { label: 'Prime Industrial Land Overlay', status: 'pil', detail: 'Self-storage is a competing use — not permitted in PIL zones' },
  // Santee
  'IL': { label: 'Industrial Light (IL)', status: 'cup', detail: 'City of Santee — CUP required for self-storage' },
  'IG': { label: 'Industrial General (IG)', status: 'cup', detail: 'City of Santee — CUP required for self-storage' },
  'IL/GC': { label: 'Industrial Light / General Commercial', status: 'cup', detail: 'City of Santee — CUP required for self-storage' },
  'IL/R-B': { label: 'Industrial Light / Retail Business', status: 'cup', detail: 'City of Santee — CUP required for self-storage' },
  'GC': { label: 'General Commercial (GC)', status: 'cup', detail: 'City of Santee — CUP required for self-storage' },
  'NC': { label: 'Neighborhood Commercial (NC)', status: 'banned', detail: 'City of Santee — self-storage not permitted' },
  'NC/R14': { label: 'Neighborhood Commercial / R-14', status: 'banned', detail: 'City of Santee — self-storage not permitted' },
  'NC/R7': { label: 'Neighborhood Commercial / R-7', status: 'banned', detail: 'City of Santee — self-storage not permitted' },
  'OP': { label: 'Office Professional (OP)', status: 'banned', detail: 'City of Santee — self-storage not permitted' },
  'TC': { label: 'Town Center (TC)', status: 'banned', detail: 'Self-storage not permitted in Town Center zones' },
  // National City
  'I': { label: 'Industrial General (I)', status: 'cup', detail: 'City of National City — CUP required for self-storage' },
  'IC': { label: 'Industrial-Commercial (IC)', status: 'cup', detail: 'City of National City — CUP required for self-storage' },
  'IH': { label: 'Industrial Heavy (IH)', status: 'cup', detail: 'City of National City — CUP required for self-storage' },
  'IM': { label: 'Industrial-Marine (IM)', status: 'banned', detail: 'City of National City — marine/port zone, self-storage not permitted' },
  'CS': { label: 'Commercial Shopping (CS)', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'CA': { label: 'Commercial Automotive (CA)', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MCR-1': { label: 'Mixed-Use Commercial-Residential 1', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MCR-2': { label: 'Mixed-Use Commercial-Residential 2', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MXC-1': { label: 'Mixed-Use Commercial 1', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MXC-2': { label: 'Mixed-Use Commercial 2', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MXD-1': { label: 'Mixed-Use Downtown 1', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  'MXD-2': { label: 'Mixed-Use Downtown 2', status: 'banned', detail: 'City of National City — self-storage not permitted' },
  // La Mesa
  'CM': { label: 'Light Industrial & Commercial Service (CM)', status: 'cup', detail: 'City of La Mesa — CUP required for self-storage' },
  'CD': { label: 'Downtown Commercial (CD)', status: 'banned', detail: 'City of La Mesa — self-storage not permitted' },
  'RB': { label: 'Residential Business (RB)', status: 'banned', detail: 'City of La Mesa — self-storage not permitted' },
  // Poway
  'PC-7': { label: 'South Poway Business Park (PC-7)', status: 'cup', detail: 'City of Poway — CUP required for self-storage in business park' },
  'PC-8': { label: 'Poway Road Corridor (PC-8)', status: 'banned', detail: 'City of Poway — self-storage not permitted' },
  'CB': { label: 'Community Business (CB)', status: 'banned', detail: 'City of Poway — self-storage not permitted' },
  'AGC': { label: 'Automotive General Commercial (AGC)', status: 'banned', detail: 'City of Poway — self-storage not permitted' },
}

function getZoneInfo(props) {
  const zone = props.zone_display || props.name || props.Zone || props.ZoningCode || props.ZoneCode || props.ZONECLASS || props.DetailCode || ''
  const city = props.city || ''
  const info = ZONE_INFO[zone] || { label: zone || 'Unknown Zone', status: 'unknown', detail: 'No storage data for this zone' }
  return { zone, city, ...info }
}

const STATUS_BADGE = {
  by_right:    { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',    text: '✅ Storage Allowed by Right' },
  cup:         { color: '#f97316', bg: 'rgba(249,115,22,0.15)',   text: '🟠 CUP Required' },
  banned:      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    text: '🚫 Self-Storage Not Permitted' },
  pending_ban: { color: '#f472b6', bg: 'rgba(244,114,182,0.15)', text: '⏳ Pending Ban (2026)' },
  pil:         { color: '#b91c1c', bg: 'rgba(185,28,28,0.15)',   text: '🔻 Prime Industrial — Not Permitted' },
  unknown:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', text: '❓ No Data' },
}

// ── OWNER / LOGO ─────────────────────────────────────────────────────────────
const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop','nsa ','stor-quest','storquest']
const UHAUL = ['u-haul','uhaul']
function classifyOwner(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (UHAUL.some(k => n.includes(k))) return 'uhaul'
  if (REITS.some(k => n.includes(k))) return 'reit'
  return 'private'
}
const COMPANIES = [
  'Public Storage','Extra Space Storage','CubeSmart','Uhaul',
  'National Storage Affiliates','SmartStop Self Storage','Simply Self Storage',
  'Life Storage','StorQuest Self Storage','Trojan Storage','InSite Property Group',
  'San Diego Self Storage','Miramar Self Storage','The Caster Group',
  'BACO Properties','Baranof Holdings','Tierra Corporation','Danube Properties',
  'The Ezralow Company','Westport Properties','Pacifica Companies',
  'Price Self Storage','Ares Management Corporation','Artemis Real Estate Partners',
  'Blue Vista','Clear Sky Capital','Prime Group Holdings','Merit Hill Capital',
  'Encinitas Self Storage','Greens Global','Northwest Building, LLC',
  'Sentry Storage Solutions','Chicago Capital Funds','CBRE Investment Management','Dan Floit',
]
function getLogoName(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (n.includes('public storage')) return 'Public Storage'
  if (n.includes('extra space')) return 'Extra Space Storage'
  if (n.includes('cubesmart')) return 'CubeSmart'
  if (n.includes('u-haul') || n.includes('uhaul')) return 'Uhaul'
  if (n.includes('national storage affiliates')) return 'National Storage Affiliates'
  if (n.includes('smartstop') || n.includes('strategic storage')) return 'SmartStop Self Storage'
  if (n.includes('simply self')) return 'Simply Self Storage'
  if (n.includes('life storage')) return 'Life Storage'
  if (n.includes('william warren') || n.includes('storquest') || n.includes('stor-quest')) return 'StorQuest Self Storage'
  if (n.includes('trojan storage')) return 'Trojan Storage'
  if (n.includes('insite') || n.includes('securespace')) return 'InSite Property Group'
  if (n.includes('san diego self storage')) return 'San Diego Self Storage'
  if (n.includes('miramar self storage')) return 'Miramar Self Storage'
  if (n.includes('caster') || n.includes('a-1 self storage') || n.includes('a-1 oceanside')) return 'The Caster Group'
  if (n.includes('baco properties')) return 'BACO Properties'
  if (n.includes('baranof')) return 'Baranof Holdings'
  if (n.includes('tierra corporation')) return 'Tierra Corporation'
  if (n.includes('danube properties')) return 'Danube Properties'
  if (n.includes('ezralow')) return 'The Ezralow Company'
  if (n.includes('westport properties')) return 'Westport Properties'
  if (n.includes('pacifica companies')) return 'Pacifica Companies'
  if (n.includes('price self storage')) return 'Price Self Storage'
  if (n.includes('ares management')) return 'Ares Management Corporation'
  if (n.includes('artemis real estate')) return 'Artemis Real Estate Partners'
  if (n.includes('blue vista')) return 'Blue Vista'
  if (n.includes('clear sky capital')) return 'Clear Sky Capital'
  if (n.includes('prime group')) return 'Prime Group Holdings'
  if (n.includes('merit hill')) return 'Merit Hill Capital'
  if (n.includes('encinitas self storage')) return 'Encinitas Self Storage'
  if (n.includes('greens global')) return 'Greens Global'
  if (n.includes('northwest building')) return 'Northwest Building, LLC'
  if (n.includes('sentry storage')) return 'Sentry Storage Solutions'
  if (n.includes('chicago capital funds')) return 'Chicago Capital Funds'
  if (n.includes('cbre investment')) return 'CBRE Investment Management'
  if (n.includes('floit')) return 'Dan Floit'
  return null
}
const LOGO_URLS = {
  'Public Storage':'https://logos.gentz.co/logo/public_storage',
  'Extra Space Storage':'https://logos.gentz.co/logo/extra-space-storage',
  'CubeSmart':'https://logos.gentz.co/logo/cubesmart',
  'Uhaul':'https://logos.gentz.co/logo/Uhaul',
  'National Storage Affiliates':'https://logos.gentz.co/logo/national-storage-affiliates',
  'SmartStop Self Storage':'https://logos.gentz.co/logo/smartstop',
  'Simply Self Storage':'https://logos.gentz.co/logo/simply-self-storage',
  'Life Storage':'https://logos.gentz.co/logo/life-storage',
  'StorQuest Self Storage':'https://logos.gentz.co/logo/storquest',
  'Trojan Storage':'https://logos.gentz.co/logo/trojan-storage',
  'InSite Property Group':'https://logos.gentz.co/logo/insite_property_group',
  'San Diego Self Storage':'https://logos.gentz.co/logo/san_diego_self_storage',
  'Miramar Self Storage':'https://logos.gentz.co/logo/miramar-self-storage',
  'The Caster Group':'https://logos.gentz.co/logo/the_caster_group',
  'BACO Properties':'https://logos.gentz.co/logo/baco-properties',
  'Baranof Holdings':'https://logos.gentz.co/logo/baranof-holdings',
  'Tierra Corporation':'https://logos.gentz.co/logo/tierra-corporation',
  'Danube Properties':'https://logos.gentz.co/logo/danube-properties',
  'The Ezralow Company':'https://logos.gentz.co/logo/ezralow',
  'Westport Properties':'https://logos.gentz.co/logo/westport-properties',
  'Pacifica Companies':'https://logos.gentz.co/logo/pacifica-companies',
  'Price Self Storage':'https://logos.gentz.co/logo/price_self_storage',
  'Ares Management Corporation':'https://logos.gentz.co/logo/ares-management',
  'Artemis Real Estate Partners':'https://logos.gentz.co/logo/artemis-real-estate',
  'Blue Vista':'https://logos.gentz.co/logo/blue-vista',
  'Clear Sky Capital':'https://logos.gentz.co/logo/clear-sky-capital',
  'Prime Group Holdings':'https://logos.gentz.co/logo/prime_group_holdings',
  'Merit Hill Capital':'https://logos.gentz.co/logo/merit_hill_capital',
  'Encinitas Self Storage':'https://logos.gentz.co/logo/encinitas_self_storage',
  'Greens Global':'https://logos.gentz.co/logo/greens_global',
  'Northwest Building, LLC':'https://logos.gentz.co/logo/northwest_building',
  'Sentry Storage Solutions':'https://logos.gentz.co/logo/sentry_storage',
  'Chicago Capital Funds':'https://logos.gentz.co/logo/chicago_capital_funds',
  'CBRE Investment Management':'https://logos.gentz.co/logo/cbre_investment',
  'Dan Floit':'https://logos.gentz.co/logo/dan_floit',
}

const LEAD_NEON = {
  active:'#00ffcc',interested:'#00ff66',under_nda:'#cc00ff',
  loi_sent:'#ff9900',dead:'#ff4444',closed:'#00ff99',
}
function LeadDot({ lead }) {
  const color = LEAD_NEON[lead.status] || '#00ffcc'
  if (!lead.lat || !lead.lng) return null
  return (
    <OverlayView position={{ lat:lead.lat,lng:lead.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div title={'LEAD: '+lead.name} style={{cursor:'pointer',transform:'translate(-50%,-50%)'}}>
        <svg width="22" height="22" style={{overflow:'visible',filter:'drop-shadow(0 0 4px '+color+')'}}>
          <circle cx="11" cy="11" r="9" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5"/>
          <circle cx="11" cy="11" r="5" fill={color} fillOpacity="0.95"/>
        </svg>
      </div>
    </OverlayView>
  )
}

function getMarkerColor(prop,colorMode) {
  if (colorMode==='status') return STATUS_COLORS[prop.callStatus]||'#60a5fa'
  if (colorMode==='owner') {
    const cls=classifyOwner(prop)
    if (cls==='uhaul') return '#ef4444'
    if (cls==='reit') return '#3b82f6'
    return '#f59e0b'
  }
  if (colorMode==='size') {
    if (prop.sf>100000) return '#ef4444'
    if (prop.sf>60000) return '#f59e0b'
    if (prop.sf>30000) return '#34d399'
    return '#60a5fa'
  }
  return STATUS_COLORS[prop.callStatus]||'#60a5fa'
}

function tile2mercBbox(x,y,z) {
  const n=Math.pow(2,z)
  const lonToMerc=lon=>lon*20037508.34/180
  const latToMerc=lat=>Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180)*20037508.34/180
  const tile2lng=x=>x/n*360-180
  const tile2lat=y=>{const r=Math.PI-2*Math.PI*y/n;return 180/Math.PI*Math.atan(0.5*(Math.exp(r)-Math.exp(-r)))}
  const w=lonToMerc(tile2lng(x)),s=latToMerc(tile2lat(y+1)),e=lonToMerc(tile2lng(x+1)),nn=latToMerc(tile2lat(y))
  return `${w},${s},${e},${nn}`
}

function Marker({prop,colorMode,onClick,isSelected}) {
  const color=getMarkerColor(prop,colorMode)
  const size=prop.sf>100000?16:prop.sf>60000?13:prop.sf>30000?10:8
  const logoName=getLogoName(prop)
  const [logoErr,setLogoErr]=useState(false)
  const showLogo=logoName&&!logoErr
  return (
    <OverlayView position={{lat:prop.lat,lng:prop.lng}} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={()=>onClick(prop)} title={prop.name||prop.address}
        style={{cursor:'pointer',transform:'translate(-50%,-50%)',position:'relative'}}>
        {showLogo?(
          <div style={{width:`${size*2+8}px`,height:`${size*2+8}px`,borderRadius:'6px',background:'#fff',
            border:`2px solid ${isSelected?'#fff':color}`,display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:isSelected?'0 0 0 3px white, 0 0 0 5px '+color:'0 1px 4px rgba(0,0,0,0.5)',
            overflow:'hidden',padding:'2px'}}>
            <img src={LOGO_URLS[logoName]} onError={()=>setLogoErr(true)}
              style={{width:'100%',height:'100%',objectFit:'contain'}}/>
          </div>
        ):(
          <svg width={size*2+4} height={size*2+4} style={{overflow:'visible'}}>
            {isSelected&&<circle cx={size+2} cy={size+2} r={size+5} fill="none" stroke="#fff" strokeWidth="2" opacity="0.8"/>}
            {prop.forSale&&<circle cx={size+2} cy={size+2} r={size+3} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4,2"/>}
            <circle cx={size+2} cy={size+2} r={size} fill={color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5"/>
          </svg>
        )}
      </div>
    </OverlayView>
  )
}

// ── ZONE INFO POPUP ───────────────────────────────────────────────────────────
function ZonePopup({info,onClose}) {
  if (!info) return null
  const badge=STATUS_BADGE[info.status]||STATUS_BADGE.unknown
  return (
    <div style={{
      position:'absolute',bottom:'16px',left:'50%',transform:'translateX(-50%)',
      background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',
      padding:'12px 16px',minWidth:'280px',maxWidth:'360px',
      boxShadow:'0 4px 24px rgba(0,0,0,0.7)',zIndex:1000,pointerEvents:'all',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:'14px',fontWeight:700,color:'#e2e8f0',marginBottom:'2px',fontFamily:'monospace'}}>
            {info.zone||'—'}
          </div>
          <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'7px'}}>
            {info.label}{info.city?` · ${info.city}`:''}
          </div>
          <div style={{
            display:'inline-block',padding:'3px 9px',borderRadius:'5px',
            background:badge.bg,color:badge.color,fontSize:'11px',fontWeight:600,
          }}>
            {badge.text}
          </div>
          {info.detail&&(
            <div style={{fontSize:'10px',color:'#64748b',marginTop:'7px',lineHeight:1.6}}>
              {info.detail}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background:'none',border:'none',color:'#475569',cursor:'pointer',
          fontSize:'18px',lineHeight:1,padding:'0 0 2px 0',flexShrink:0,
        }}>×</button>
      </div>
    </div>
  )
}

const MAP_DARK_STYLE=[
  {elementType:'geometry',stylers:[{color:'#0d1526'}]},
  {elementType:'labels.text.stroke',stylers:[{color:'#0d1526'}]},
  {elementType:'labels.text.fill',stylers:[{color:'#746855'}]},
  {featureType:'administrative.locality',elementType:'labels.text.fill',stylers:[{color:'#d59563'}]},
  {featureType:'poi',stylers:[{visibility:'off'}]},
  {featureType:'road',elementType:'geometry',stylers:[{color:'#1e2d47'}]},
  {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#2d3f5e'}]},
  {featureType:'road.highway',elementType:'labels.text.fill',stylers:[{color:'#f3d19c'}]},
  {featureType:'transit',stylers:[{visibility:'off'}]},
  {featureType:'water',elementType:'geometry',stylers:[{color:'#040d1a'}]},
]

export default function MapView({properties,selectedProperty,setSelectedProperty,updateProperty,currentUser}) {
  const isLoaded=useGoogleMaps()
  const mapRef=useRef(null)
  const parcelOverlayRef=useRef(null)
  const greenLayerRef=useRef(null)
  const pureGreenLayerRef=useRef(null)
  const cupLayerRef=useRef(null)
  const redLayerRef=useRef(null)
  const ipLayerRef=useRef(null)
  const pilLayerRef=useRef(null)
  const orangeLayerRef=useRef(null)

  const [greenData,setGreenData]=useState(null)
  const [pureGreenData,setPureGreenData]=useState(null)
  const [cupData,setCupData]=useState(null)
  const [redData,setRedData]=useState(null)
  const [ipData,setIpData]=useState(null)
  const [pilData,setPilData]=useState(null)
  const [orangeData,setOrangeData]=useState(null)

  const [mapType,setMapType]=useState('dark')
  const [showParcel,setShowParcel]=useState(false)
  const [showGreen,setShowGreen]=useState(false)
  const [showPureGreen,setShowPureGreen]=useState(false)
  const [showCup,setShowCup]=useState(false)
  const [showRed,setShowRed]=useState(true)
  const [showPIL,setShowPIL]=useState(true)
  const [showOrange,setShowOrange]=useState(false)
  const [showLocations,setShowLocations]=useState(true)   // Feature 2
  const [filterCompanies,setFilterCompanies]=useState(new Set())  // Feature 4
  const [filterStatus,setFilterStatus]=useState('all')
  const [filterSubmarket,setFilterSubmarket]=useState('all')
  const [colorMode,setColorMode]=useState('status')
  const [leads,setLeads]=useState([])
  const [detailProp,setDetailProp]=useState(null)
  const [mapReady,setMapReady]=useState(false)
  const [zonePopup,setZonePopup]=useState(null)   // Feature 1

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'storvault_leads'),snap=>{
      setLeads(snap.docs.map(d=>({_docId:d.id,...d.data()})))
    })
    return ()=>unsub()
  },[])

  useEffect(()=>{
    if (!isLoaded||!window.google) return
    const needsGeo=leads.filter(l=>!l.lat||!l.lng)
    if (!needsGeo.length) return
    const geocoder=new window.google.maps.Geocoder()
    needsGeo.forEach(lead=>{
      const q=[lead.address||lead.name,lead.city,'CA'].filter(Boolean).join(', ')
      if (!q.trim()) return
      geocoder.geocode({address:q},(results,status)=>{
        if (status==='OK'&&results[0]) {
          const loc=results[0].geometry.location
          setLeads(prev=>prev.map(l=>l._docId===lead._docId?{...l,lat:loc.lat(),lng:loc.lng()}:l))
        }
      })
    })
  },[leads.length,isLoaded])

  const submarkets=useMemo(()=>[...new Set(properties.map(p=>p.submarket))].filter(Boolean).sort(),[properties])

  const filteredProps=useMemo(()=>properties.filter(p=>{
    if (filterStatus!=='all'&&p.callStatus!==filterStatus) return false
    if (filterSubmarket!=='all'&&p.submarket!==filterSubmarket) return false
    if (filterCompanies.size>0) {
      const logo=getLogoName(p)
      if (!logo||!filterCompanies.has(logo)) return false
    }
    return true
  }),[properties,filterStatus,filterSubmarket,filterCompanies])

  useEffect(()=>{
    fetch('/green_all.geojson').then(r=>r.json()).then(setGreenData).catch(()=>{})
    fetch('/green_pure.geojson').then(r=>r.json()).then(setPureGreenData).catch(()=>{})
    fetch('/cup_all.geojson').then(r=>r.json()).then(setCupData).catch(()=>{})
    fetch('/red_all.geojson').then(r=>r.json()).then(setRedData).catch(()=>{})
    fetch('/ip_zones.geojson').then(r=>r.json()).then(setIpData).catch(()=>{})
    fetch('/industrial_overlay.geojson').then(r=>r.json()).then(setPilData).catch(()=>{})
    fetch('/orange_overlay.geojson').then(r=>r.json()).then(setOrangeData).catch(()=>{})
  },[])

  // Helper: render layer + attach zone-click listener (Feature 1)
  function renderLayer(layerRef,data,show,fill,stroke,fillOp) {
    const map=mapRef.current
    if (!map||!window.google) return
    if (layerRef.current) { layerRef.current.setMap(null); layerRef.current=null }
    if (!show||!data) return
    const layer=new window.google.maps.Data()
    layer.addGeoJson(data)
    layer.setStyle({fillColor:fill,fillOpacity:fillOp,strokeColor:stroke,strokeWeight:1.5,strokeOpacity:0.75})
    layer.setMap(map)
    layer.addListener('click',(event)=>{
      const allProps={}
      event.feature.forEachProperty((val,key)=>{allProps[key]=val})
      setZonePopup(getZoneInfo(allProps))
    })
    layerRef.current=layer
  }

  useEffect(()=>{renderLayer(greenLayerRef,greenData,showGreen,'#22c55e','#16a34a',0.30)},[showGreen,greenData,mapReady])
  useEffect(()=>{renderLayer(pureGreenLayerRef,pureGreenData,showPureGreen,'#00ff88','#00cc44',0.45)},[showPureGreen,pureGreenData,mapReady])
  useEffect(()=>{renderLayer(cupLayerRef,cupData,showCup,'#f97316','#ea580c',0.28)},[showCup,cupData,mapReady])
  useEffect(()=>{renderLayer(redLayerRef,redData,showRed,'#ef4444','#dc2626',0.30)},[showRed,redData,mapReady])
  useEffect(()=>{renderLayer(ipLayerRef,ipData,showRed,'#ef4444','#dc2626',0.26)},[showRed,ipData,mapReady])
  useEffect(()=>{renderLayer(pilLayerRef,pilData,showPIL,'#b91c1c','#991b1b',0.35)},[showPIL,pilData,mapReady])
  useEffect(()=>{renderLayer(orangeLayerRef,orangeData,showOrange,'#f472b6','#ec4899',0.30)},[showOrange,orangeData,mapReady])

  useEffect(()=>{
    const map=mapRef.current
    if (!map||!window.google) return
    if (parcelOverlayRef.current) {
      const arr=map.overlayMapTypes.getArray()
      const idx=arr.indexOf(parcelOverlayRef.current)
      if (idx>-1) map.overlayMapTypes.removeAt(idx)
      parcelOverlayRef.current=null
    }
    if (!showParcel) return
    const overlay=new window.google.maps.ImageMapType({
      name:'Parcels',tileSize:new window.google.maps.Size(256,256),
      maxZoom:21,minZoom:14,opacity:1.0,
      getTileUrl:(coord,zoom)=>{
        if (zoom<14) return null
        const bbox=tile2mercBbox(coord.x,coord.y,zoom)
        return `${PARCEL_URL}?bbox=${bbox}&size=256,256&imageSR=3857&bboxSR=3857&format=png32&transparent=true&f=image&dynamicLayers=${PARCEL_LAYERS}`
      }
    })
    map.overlayMapTypes.push(overlay)
    parcelOverlayRef.current=overlay
  },[showParcel,mapRef.current])

  const onMapLoad=useCallback((map)=>{
    mapRef.current=map
    setMapReady(true)
    if (window.google) map.setOptions({styles:MAP_DARK_STYLE})
  },[])

  useEffect(()=>{
    if (selectedProperty&&mapRef.current)
      mapRef.current.panTo({lat:selectedProperty.lat,lng:selectedProperty.lng})
  },[selectedProperty])

  const [mapOptions]=useState({
    center:{lat:32.78,lng:-117.1},zoom:10,mapTypeId:'roadmap',
    mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'greedy',
  })

  useEffect(()=>{
    const map=mapRef.current
    if (!map||!window.google) return
    const typeId=mapType==='aerial'?'satellite':mapType==='hybrid'?'hybrid':'roadmap'
    const styles=mapType==='dark'?MAP_DARK_STYLE:[]
    map.setMapTypeId(typeId)
    map.setOptions({styles})
  },[mapType,mapReady])

  const selStyle={background:'#1e2d47',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#e2e8f0',fontSize:'11px',padding:'5px 7px',width:'100%'}
  const btnStyle=(active,accent)=>({
    padding:'5px 9px',border:'none',borderRadius:'5px',cursor:'pointer',
    fontSize:'10px',fontWeight:600,transition:'all 0.15s',
    background:active?(accent||'#f59e0b'):'#1e2d47',
    color:active?(accent?'#fff':'#000'):'#94a3b8',
  })

  return (
    <div style={{display:'flex',height:'100%'}}>
      <div style={{width:'185px',background:'#0d1526',borderRight:'1px solid #1e2d47',padding:'12px',display:'flex',flexDirection:'column',gap:'12px',overflowY:'auto',flexShrink:0}}>

        <MapControls
          mapType={mapType} setMapType={setMapType}
          showGreen={showGreen} setShowGreen={setShowGreen}
          showPureGreen={showPureGreen} setShowPureGreen={setShowPureGreen}
          showCup={showCup} setShowCup={setShowCup}
          showRed={showRed} setShowRed={setShowRed}
          showOrange={showOrange} setShowOrange={setShowOrange}
          showPIL={showPIL} setShowPIL={setShowPIL}
          showParcel={showParcel} setShowParcel={setShowParcel}
          showLocations={showLocations} setShowLocations={setShowLocations}
        />

        <div>
          <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>COLOR BY</div>
          {[['status','Call Status'],['owner','Owner Type'],['size','Building Size']].map(([v,l])=>(
            <button key={v} onClick={()=>setColorMode(v)} style={{...btnStyle(colorMode===v),display:'block',width:'100%',textAlign:'left',marginBottom:'3px',fontSize:'10px'}}>{l}</button>
          ))}
        </div>

        {/* Feature 4: Per-company filter */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
            <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em'}}>COMPANIES</div>
            {filterCompanies.size>0&&(
              <button onClick={()=>setFilterCompanies(new Set())} style={{fontSize:'8px',color:'#60a5fa',background:'none',border:'none',cursor:'pointer',padding:0}}>Show All</button>
            )}
          </div>
          <div style={{maxHeight:'130px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'1px'}}>
            {COMPANIES.map(co=>{
              const active=filterCompanies.has(co)
              return (
                <button key={co} onClick={()=>{
                  setFilterCompanies(prev=>{const next=new Set(prev);active?next.delete(co):next.add(co);return next})
                }} style={{
                  padding:'3px 6px',borderRadius:'4px',cursor:'pointer',textAlign:'left',
                  fontSize:'9px',fontWeight:active?700:400,
                  background:active?'rgba(96,165,250,0.18)':'transparent',
                  color:active?'#60a5fa':'#64748b',
                  border:active?'1px solid rgba(96,165,250,0.35)':'1px solid transparent',
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                }}>{co}</button>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'4px'}}>FILTER STATUS</div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selStyle}>
            <option value="all">All</option>
            {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        <div>
          <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'4px'}}>SUBMARKET</div>
          <select value={filterSubmarket} onChange={e=>setFilterSubmarket(e.target.value)} style={selStyle}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {colorMode==='status'&&(
          <div>
            <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>LEGEND</div>
            {Object.entries(STATUS_COLORS).map(([k,c])=>(
              <div key={k} style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:c,flexShrink:0}}/>
                <span style={{fontSize:'10px',color:'#94a3b8',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
              </div>
            ))}
          </div>
        )}
        {leads.length>0&&(
          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#00ffcc',flexShrink:0}}/>
            <span style={{fontSize:'10px',color:'#94a3b8'}}>Leads ({leads.length})</span>
          </div>
        )}

        <div style={{fontSize:'10px',color:'#475569',marginTop:'auto',paddingTop:'8px',borderTop:'1px solid #1e2d47'}}>
          <strong style={{color:'#60a5fa'}}>{filteredProps.length}</strong> of {properties.length}
          {filterCompanies.size>0&&<div style={{color:'#f59e0b',fontSize:'9px',marginTop:'2px'}}>{filterCompanies.size} selected</div>}
        </div>
      </div>

      <div style={{flex:1,position:'relative'}}>
        {isLoaded?(
          <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} options={mapOptions} onLoad={onMapLoad}>
            {showLocations&&filteredProps.map(prop=>(
              prop.lat&&prop.lng?(
                <Marker key={prop.id} prop={prop} colorMode={colorMode}
                  onClick={setSelectedProperty} isSelected={selectedProperty?.id===prop.id}/>
              ):null
            ))}
            {showLocations&&leads.filter(l=>l.lat&&l.lng).map(lead=>(
              <LeadDot key={lead._docId} lead={lead}/>
            ))}
          </GoogleMap>
        ):(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#475569'}}>Loading map…</div>
        )}
        <ZonePopup info={zonePopup} onClose={()=>setZonePopup(null)}/>
      </div>

      {selectedProperty&&(
        <PropertyDrawer currentUser={currentUser}
          property={properties.find(p=>p.id===selectedProperty.id)||selectedProperty}
          onClose={()=>setSelectedProperty(null)}
          updateProperty={updateProperty}
          onViewDetail={(prop)=>setDetailProp(prop)}/>
      )}
      {detailProp&&(
        <PropertyDetail property={properties.find(p=>p.id===detailProp.id)||detailProp}
          onClose={()=>setDetailProp(null)} updateProperty={updateProperty} currentUser={currentUser}/>
      )}
    </div>
  )
}
