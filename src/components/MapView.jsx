import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import PropertyDrawer from './PropertyDrawer.jsx'
import PropertyDetail from './PropertyDetail.jsx'
import { db } from '../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import MapControls from './MapControls.jsx'

const GMAPS_KEY = 'AIzaSyDL-wZEWHToMMlbCF2YybG4CC-20X3tpn4'
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
  'IS-1-1': { label: 'Industrial Small Lot Zone', status: 'by_right', detail: 'Moving & Storage Facilities permitted by right per SDMC Table 131-06B §P(23). Not in Prime Industrial Lands — self-storage fully viable.' },
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
  // Centre City Planned District (Downtown SD)
  'CCPD-MC': { label: 'Centre City Mixed Commercial', status: 'by_right', detail: 'Downtown SD — Moving & Storage Facilities permitted by right (CCPDO Table 0308-A). 2401 Pacific Hwy is active example.' },
  'CCPD-I':  { label: 'Centre City Industrial', status: 'by_right', detail: 'Downtown SD — Moving & Storage Facilities permitted by right (CCPDO Table 0308-A).' },
  'CCPD-T':  { label: 'Centre City Transition', status: 'by_right', detail: 'Downtown SD — Moving & Storage Facilities permitted by right (CCPDO Table 0308-A).' },
  'CCPD-BP': { label: 'Centre City Ballpark Mixed-Use', status: 'cup', detail: 'Downtown SD — Storage limited to 20% gross floor area above grade (CCPDO footnote 5). Not viable for pure storage play.' },
  'CCPD-ER': { label: 'Centre City East Village Retail', status: 'cup', detail: 'Downtown SD — Storage limited to 20% gross floor area above grade (CCPDO footnote 5). Not viable for pure storage play.' },
  'CCPD-CORE': { label: 'Centre City Core', status: 'cup', detail: 'Downtown SD — Storage limited to 20% gross floor area above grade (CCPDO footnote 5). Not viable for pure storage play.' },
  'CCPD-NC': { label: 'Centre City Neighborhood Commercial', status: 'banned', detail: 'Downtown SD — Self-storage not permitted. Researched per CCPDO Table 0308-A. No path forward for storage in this zone.' },
  'CCPD-RE': { label: 'Centre City Residential', status: 'banned', detail: 'Downtown SD — Residential zone. Self-storage not permitted per CCPDO Table 0308-A. No path forward for storage in this zone.' },
  'CCPD-OS': { label: 'Centre City Open Space', status: 'banned', detail: 'Downtown SD — Open Space zone. Self-storage not permitted per CCPDO Table 0308-A. No path forward for storage in this zone.' },
  'CCPD-PC': { label: 'Centre City Park/Civic', status: 'banned', detail: 'Downtown SD — Park/Civic zone. Self-storage not permitted per CCPDO Table 0308-A. No path forward for storage in this zone.' },
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
  // Solana Beach
  'LI': { label: 'Light Industrial (LI)', status: 'cup', detail: 'City of Solana Beach — CUP required. SBMC 17.24.010-D explicitly names "personal storage" as a permitted use type in LI. Mini-warehouses/personal storage appear in use matrix as conditional use. Truck rental allowed as accessory use to self-storage. Only a small LI corridor east of I-5 near Via de la Valle.' },
  'Solana Beach': { label: 'City of Solana Beach', status: 'banned', detail: 'City of Solana Beach — self-storage not permitted outside the LI zone. Commercial zones (C, LC, OP) all prohibit mini-warehouses per SBMC Table 17.12.020-A.' },
  // Imperial Beach
  'M-1': { label: 'Light Industrial (M-1)', status: 'cup', detail: 'City of Imperial Beach — Small industrial pocket near Hollister St/Bay Blvd. Existing A-1 Self Storage at 845 Hollister St confirms use is established. Governed by older LCP ordinance (Title 18/19). Very limited footprint (~2 blocks).' },
  'Imperial Beach': { label: 'City of Imperial Beach', status: 'banned', detail: 'City of Imperial Beach — C/MU-1, C/MU-2, C/MU-3 commercial zones: self-storage not listed = prohibited per IB code §19.23. Only the small Hollister St M-1 industrial pocket allows storage.' },
  // Del Mar — confirmed no industrial zone
  'Del Mar': { label: 'City of Del Mar', status: 'banned', detail: 'City of Del Mar — No industrial zone exists. Zoning code (Title 30) contains only residential and small commercial zones (RC, Central Commercial, Beach Commercial, North Commercial, Professional Commercial, Visitor Commercial, FR). Self-storage is not a permitted use in any Del Mar zone. Confirmed via Del Mar Municipal Code Ch. 30.' },
  // Coronado — confirmed no industrial zone
  'Coronado': { label: 'City of Coronado', status: 'banned', detail: 'City of Coronado — No industrial zone exists. Zones are entirely residential (R-1A, R-1B, R-3 through R-5), commercial (C), commercial recreation (C-R), hotel-motel (H-M), civic use (C-U), open space (OS), and MZ (Military Zone/Navy base). Self-storage not a permitted or conditional use in any zone. Confirmed via Coronado Municipal Code §86.' },
  // Lemon Grove
  'Light Industrial': { label: 'Light Industrial (LI)', status: 'cup', detail: 'City of Lemon Grove — CUP required for self-storage' },
  'Retail Manufacturing': { label: 'Retail Manufacturing (ReM)', status: 'cup', detail: 'City of Lemon Grove — CUP required for self-storage' },
  'Light Industrial (LI)': { label: 'Light Industrial (LI)', status: 'cup', detail: 'City of Lemon Grove — CUP required for self-storage' },
  'Retail Manufacturing (ReM)': { label: 'Retail Manufacturing (ReM)', status: 'cup', detail: 'City of Lemon Grove — CUP required for self-storage' },
  'General Commercial': { label: 'General Commercial (GC)', status: 'banned', detail: 'Self-storage not permitted' },
  'Central Commercial': { label: 'Central Commercial (CC)', status: 'banned', detail: 'Self-storage not permitted' },
  'Heavy Commercial': { label: 'Heavy Commercial (HC)', status: 'banned', detail: 'Self-storage not permitted' },
  'Limited Commercial': { label: 'Limited Commercial (LC)', status: 'banned', detail: 'Self-storage not permitted' },
  // Encinitas
  'LI': { label: 'Light Industrial (LI)', status: 'cup', detail: 'City of Encinitas — CUP required for self-storage' },
  'BP': { label: 'Business Park (BP)', status: 'cup', detail: 'City of Encinitas — CUP required for self-storage' },
  'GC-PCD': { label: 'General Commercial PCD', status: 'cup', detail: 'City of Encinitas — CUP required; planned commercial development' },
  'GC': { label: 'General Commercial (GC)', status: 'banned', detail: 'City of Encinitas — self-storage not permitted' },
  'LC': { label: 'Limited Commercial (LC)', status: 'banned', detail: 'Self-storage not permitted' },
  'D-CC': { label: 'Downtown Civic Core (CC)', status: 'banned', detail: 'City of Encinitas Downtown — self-storage not permitted' },
  'D-CM-1': { label: 'Downtown Commercial Mixed 1 (CM-1)', status: 'banned', detail: 'City of Encinitas Downtown — self-storage not permitted' },
  'D-CM-2': { label: 'Downtown Commercial Mixed 2 (CM-2)', status: 'banned', detail: 'City of Encinitas Downtown — self-storage not permitted' },
  'N-CM-1': { label: 'North 101 Commercial Mixed 1', status: 'banned', detail: 'City of Encinitas North 101 — self-storage not permitted' },
  'N-CM-2': { label: 'North 101 Commercial Mixed 2', status: 'banned', detail: 'City of Encinitas North 101 — self-storage not permitted' },
  'N-CM-3': { label: 'North 101 Commercial Mixed 3', status: 'banned', detail: 'City of Encinitas North 101 — self-storage not permitted' },
  // Unincorporated Riverside County — Ord. 348 / RCC Ch. 17.240 Mini-Warehouses
  'C-1/C-P': { label: 'General Commercial (C-1/C-P)', status: 'cup', detail: 'Unincorporated Riverside County — Mini-warehouses allowed with an approved Conditional Use Permit (RCC §17.240.020.A)' },
  'I-P': { label: 'Industrial Park (I-P)', status: 'cup', detail: 'Unincorporated Riverside County — Mini-warehouses allowed with an approved Plot Plan (RCC §17.240.020.B)' },
  'M-SC': { label: 'Manufacturing-Service Commercial (M-SC)', status: 'cup', detail: 'Unincorporated Riverside County — Mini-warehouses allowed with an approved Plot Plan (RCC §17.240.020.B)' },
  'M-M': { label: 'Manufacturing-Medium (M-M)', status: 'cup', detail: 'Unincorporated Riverside County — Mini-warehouses allowed with an approved Plot Plan (RCC §17.240.020.B)' },
  'M-H': { label: 'Manufacturing-Heavy (M-H)', status: 'cup', detail: 'Unincorporated Riverside County — Mini-warehouses allowed with an approved Plot Plan (RCC §17.240.020.B)' },
  'C-P-S': { label: 'Scenic Highway Commercial (C-P-S)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'C-R': { label: 'Rural Commercial (C-R)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'C-O': { label: 'Commercial Office (C-O)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'C-T': { label: 'Tourist Commercial (C-T)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'MU': { label: 'Mixed Use (MU)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'C/V': { label: 'Citrus/Vineyard (C/V)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  'C-C/V': { label: 'Commercial Citrus/Vineyard (C-C/V)', status: 'banned', detail: 'Unincorporated Riverside County — Mini-warehouses not listed as a permitted use in this zone (RCC §17.240.020); not permitted' },
  // City of Moreno Valley — Title 9, Permitted Uses Table 9.02.020-1 (Storage Lots and Mini-Warehouses)
  'MV-I': { label: 'Industrial (I)', status: 'by_right', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses (indoor & outdoor) permitted by right (Table 9.02.020-1)' },
  'MV-CC': { label: 'Community Commercial (CC)', status: 'cup', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses (indoor & outdoor) allowed with a Conditional Use Permit (Table 9.02.020-1)' },
  'MV-NC': { label: 'Neighborhood Commercial (NC)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-VC': { label: 'Village Commercial (VC)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-OC': { label: 'Office Commercial (OC)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-O': { label: 'Office (O)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-P': { label: 'Public (P)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-LI': { label: 'Light Industrial (LI)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-BP': { label: 'Business Park (BP)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-BPX': { label: 'Business Park-Mixed Use (BPX)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  'MV-OS': { label: 'Open Space (OS)', status: 'banned', detail: 'City of Moreno Valley — Storage Lots and Mini-Warehouses not listed as a permitted use in this zone (Table 9.02.020-1); not permitted' },
  // City of Corona — Title 17 Zoning, Chapter 17.44 (Industrial, Table 1) & Chapter 17.33 (Commercial/Office, Table 1-17.33)
  'M1': { label: 'Light Manufacturing (M-1)', status: 'cup', detail: 'City of Corona — Storage facility, self storage requires a Conditional Use Permit (Chapter 17.44, Table 1)' },
  'M2': { label: 'General Manufacturing (M-2)', status: 'banned', detail: 'City of Corona — Storage facility, self storage not permitted (Chapter 17.44, Table 1)' },
  'M2/O': { label: 'General Manufacturing / Office Overlay (M-2/O)', status: 'banned', detail: 'City of Corona — Storage facility, self storage not permitted in M-2 base zone (Chapter 17.44, Table 1)' },
  'M3': { label: 'Heavy Manufacturing (M-3)', status: 'banned', detail: 'City of Corona — Storage facility, self storage not permitted (Chapter 17.44, Table 1)' },
  'M3/MR': { label: 'Heavy Manufacturing / Mineral Resources Overlay (M-3/MR)', status: 'banned', detail: 'City of Corona — Storage facility, self storage not permitted in M-3 base zone (Chapter 17.44, Table 1)' },
  'M4': { label: 'Industrial Park (M-4)', status: 'banned', detail: 'City of Corona — Storage facility, self storage not permitted (Chapter 17.44, Table 1)' },
  'CP': { label: 'Professional and Office (C-P)', status: 'banned', detail: 'City of Corona — Self storage / mini-warehouse not listed as a permitted use (Chapter 17.33, Table 1-17.33)' },
  'OP': { label: 'Office Professional (O-P)', status: 'banned', detail: 'City of Corona — Self storage / mini-warehouse not listed as a permitted use (Chapter 17.33, Table 1-17.33)' },
  'C2': { label: 'Restricted Commercial (C-2)', status: 'banned', detail: 'City of Corona — Self storage / mini-warehouse not listed as a permitted use (Chapter 17.33, Table 1-17.33)' },
  'C3': { label: 'General Commercial (C-3)', status: 'banned', detail: 'City of Corona — Self storage / mini-warehouse not listed as a permitted use (Chapter 17.33, Table 1-17.33)' },
  // City of Perris — Title 19 Zoning Ordinance, Chapter 19.44 (Industrial Zones, Sec. 19.44.020 Table) & Chapter 19.43 (PO Zone, Sec. 19.43.020/030)
  'PER-LI': { label: 'Light Industrial (LI)', status: 'by_right', detail: 'City of Perris — Mini-storage/wholesale storage permitted by right (Sec. 19.44.020, Table: Allowed Land Uses in Industrial Zone Districts)' },
  'PER-GI': { label: 'General Industrial (GI)', status: 'by_right', detail: 'City of Perris — Mini-storage/wholesale storage permitted by right (Sec. 19.44.020, Table: Allowed Land Uses in Industrial Zone Districts)' },
  'PER-BP': { label: 'Business Park (BP)', status: 'cup', detail: 'City of Perris — Mini-storage/wholesale storage requires a Conditional Use Permit (Sec. 19.44.020, Table: Allowed Land Uses in Industrial Zone Districts)' },
  'PER-PO': { label: 'Professional Office (PO)', status: 'cup', detail: 'City of Perris — Mini-storage/wholesale storage requires a Conditional Use Permit (Sec. 19.43.030(6))' },
  'PER-CN': { label: 'Commercial Neighborhood (CN)', status: 'banned', detail: 'City of Perris — Self-storage/mini-warehouse not listed as a permitted or CUP use (Sec. 19.36.020 & 19.36.030)' },
  'PER-CC': { label: 'Commercial Community (CC)', status: 'banned', detail: 'City of Perris — Self-storage/mini-warehouse not listed as a permitted or CUP use (Sec. 19.38.020 & 19.38.030)' },
  // City of Menifee — Development Code (adopted 2019, eff. 2020), Table 9.135.030-1 (Commercial/Industrial Zones) & Table 9.140.030-1 (EDC Zones)
  'MNF-HI': { label: 'Heavy Industrial/Manufacturing (HI)', status: 'by_right', detail: 'City of Menifee — Self-Storage, public storage facilities permitted by right (Development Code Table 9.135.030-1)' },
  'MNF-CR': { label: 'Commercial Retail (CR)', status: 'cup', detail: 'City of Menifee — Self-Storage, public storage facilities require a Conditional Use Permit (Development Code Table 9.135.030-1)' },
  'MNF-BP': { label: 'Business Park/Light Industrial (BP)', status: 'cup', detail: 'City of Menifee — Self-Storage, public storage facilities require a Conditional Use Permit (Development Code Table 9.135.030-1)' },
  'MNF-CO': { label: 'Commercial Office (CO)', status: 'banned', detail: 'City of Menifee — Self-Storage, public storage facilities not a permitted use (Development Code Table 9.135.030-1)' },
  'MNF-EDC-NG': { label: 'Economic Development Corridor - Northern Gateway (EDC-NG)', status: 'banned', detail: 'City of Menifee — New Self-Storage, public storage facilities not permitted in EDC zones (Development Code Table 9.140.030-1)' },
  'MNF-EDC-MB': { label: 'Economic Development Corridor - McCall Boulevard (EDC-MB)', status: 'banned', detail: 'City of Menifee — New Self-Storage, public storage facilities not permitted in EDC zones (Development Code Table 9.140.030-1)' },
  'MNF-EDC-CC': { label: 'Economic Development Corridor - Community Core (EDC-CC)', status: 'banned', detail: 'City of Menifee — New Self-Storage, public storage facilities not permitted in EDC zones, including the Auto Overlay (Development Code Table 9.140.030-1)' },
  'MNF-EDC-NR': { label: 'Economic Development Corridor - Newport Road (EDC-NR)', status: 'banned', detail: 'City of Menifee — New Self-Storage, public storage facilities not permitted in EDC zones (Development Code Table 9.140.030-1)' },
  'MNF-EDC-SG': { label: 'Economic Development Corridor - Southern Gateway (EDC-SG)', status: 'banned', detail: 'City of Menifee — New Self-Storage, public storage facilities not permitted in EDC zones (Development Code Table 9.140.030-1)' },
  // City of Temecula — Title 17 Zoning, Chapter 17.08, Table 17.08.030 (Schedule of Permitted Uses, Commercial/Office/Industrial Districts) — "Mini-storage or mini-warehouse facilities"
  'TEM-SC': { label: 'Service Commercial (SC)', status: 'by_right', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities permitted by right (Table 17.08.030)' },
  'TEM-LI': { label: 'Light Industrial (LI)', status: 'by_right', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities permitted by right (Table 17.08.030)' },
  'TEM-CC': { label: 'Community Commercial (CC)', status: 'cup', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities require a Conditional Use Permit (Table 17.08.030)' },
  'TEM-BP': { label: 'Business Park (BP)', status: 'cup', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities require a Conditional Use Permit (Table 17.08.030)' },
  'TEM-NC': { label: 'Neighborhood Commercial (NC)', status: 'banned', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities not permitted (Table 17.08.030)' },
  'TEM-HT': { label: 'Highway/Tourist Commercial (HT)', status: 'banned', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities not permitted (Table 17.08.030)' },
  'TEM-PO': { label: 'Professional Office (PO)', status: 'banned', detail: 'City of Temecula — Mini-storage or mini-warehouse facilities not permitted (Table 17.08.030)' },
  // City of Jurupa Valley — Title 9 Planning & Zoning Municipal Code (mirrors Riverside County Ord. 348 zone classifications)
  'JV-C-1/C-P': { label: 'General Commercial (C-1/C-P)', status: 'cup', detail: 'City of Jurupa Valley — Mini-warehouse structures require a Conditional Use Permit (Muni. Code §9.115.020.C.9; CUP per §9.240.280)' },
  'JV-I-P': { label: 'Industrial Park (I-P)', status: 'cup', detail: 'City of Jurupa Valley — Mini warehouses (self-storage) permitted subject to Site Development Permit (Muni. Code §9.145.020.B(1)(g)(viii); SDP per §9.240.330; standards per §9.240.470)' },
  'JV-M-SC': { label: 'Manufacturing-Service Commercial (M-SC)', status: 'cup', detail: 'City of Jurupa Valley — Mini warehouses (self-storage) permitted subject to Site Development Permit (Muni. Code §9.148.020.B; SDP per §9.240.330; standards per §9.240.470)' },
  'JV-M-M': { label: 'Manufacturing-Medium (M-M)', status: 'cup', detail: 'City of Jurupa Valley — Mini warehouses (self-storage) permitted subject to Site Development Permit (Muni. Code §9.150.020.B; SDP per §9.240.330; standards per §9.240.470)' },
  'JV-M-H': { label: 'Manufacturing-Heavy (M-H)', status: 'cup', detail: 'City of Jurupa Valley — Mini warehouses (self-storage) permitted subject to Site Development Permit (Muni. Code §9.155.020.B; SDP per §9.240.330; standards per §9.240.470)' },
  'JV-R-VC': { label: 'Rubidoux Village Commercial (R-VC)', status: 'cup', detail: 'City of Jurupa Valley — Mini-warehouse structures permitted by Conditional Use Permit in West/East Village areas (Muni. Code §9.140.020.C(11); CUP per §9.240.280)' },
  'JV-B-P': { label: 'Business Park (B-P)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not a permitted use; zone purpose excludes general warehousing, distribution, shipping, or logistics (Muni. Code §9.112.020, §9.112.010)' },
  'JV-M-R': { label: 'Mineral Resources (M-R)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.165.020)' },
  'JV-M-R-A': { label: 'Mineral Resources and Related Manufacturing (M-R-A)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.170.020)' },
  'JV-C-T': { label: 'Tourist Commercial (C-T)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.120.020)' },
  'JV-C-P-S': { label: 'Scenic Highway Commercial (C-P-S)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.125.020)' },
  'JV-C-R': { label: 'Rural Commercial (C-R)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.130.020)' },
  'JV-C-N': { label: 'Commercial-Neighborhood (C-N)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.132.020)' },
  'JV-C-O': { label: 'Commercial-Office (C-O)', status: 'banned', detail: 'City of Jurupa Valley — Mini-warehouses/self-storage not listed as a permitted use (Muni. Code §9.135.020)' },
  // City of Murrieta — Development Code Title 16, Table 16.10-1 (Commercial), Table 16.12-1 (Industrial), Table 16.13-1 (Innovation District) — "Storage, Personal Storage Facility"
  'MUR-BP': { label: 'Business Park (BP)', status: 'cup', detail: 'City of Murrieta — Personal storage facilities require a Conditional Use Permit (Table 16.12-1)' },
  'MUR-GI': { label: 'General Industrial (GI)', status: 'cup', detail: 'City of Murrieta — Personal storage facilities require a Conditional Use Permit (Table 16.12-1)' },
  'MUR-NC': { label: 'Neighborhood Commercial (NC)', status: 'cup', detail: 'City of Murrieta — Personal storage facilities require a Conditional Use Permit (Table 16.10-1)' },
  'MUR-CC': { label: 'Community Commercial (CC)', status: 'cup', detail: 'City of Murrieta — Personal storage facilities require a Conditional Use Permit (Table 16.10-1)' },
  'MUR-GIA': { label: 'General Industrial-Annex (GI-A)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not permitted (Table 16.12-1)' },
  'MUR-O': { label: 'Office (O)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not permitted (Table 16.10-1)' },
  'MUR-ORP': { label: 'Office/Research/Professional (ORP)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not permitted (Table 16.12-1)' },
  'MUR-RC': { label: 'Regional Commercial (RC)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not permitted (Table 16.10-1)' },
  'MUR-INN': { label: 'Innovation District (INN)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not listed as a permitted use (Table 16.13-1)' },
  'MUR-C/I': { label: 'Commercial/Industrial (C/I)', status: 'banned', detail: 'City of Murrieta — Personal storage facilities not permitted (Table 16.12-1)' },
  // City of Hemet — Municipal Code Chapter 90 Zoning, Art. XXVI Commercial Zones (Sec. 90-893 Land Use Matrix) & Art. XXX Manufacturing Zones (Sec. 90-1043 Land Use Matrix) — "Storage facility (personal, mini-storage)"
  'HMT-O-P': { label: 'Office Professional (O-P)', status: 'banned', detail: 'City of Hemet — Storage facility (personal, mini-storage) not permitted (Sec. 90-893 Commercial Zones Land Use Matrix, Item H.12; Secs. 90-4, 90-81)' },
  'HMT-C-1': { label: 'Neighborhood Commercial (C-1)', status: 'banned', detail: 'City of Hemet — Storage facility (personal, mini-storage) not permitted (Sec. 90-893 Commercial Zones Land Use Matrix, Item H.12; Secs. 90-4, 90-81)' },
  'HMT-C-2': { label: 'General Commercial (C-2)', status: 'banned', detail: 'City of Hemet — Storage facility (personal, mini-storage) not permitted (Sec. 90-893 Commercial Zones Land Use Matrix, Item H.12; Secs. 90-4, 90-81)' },
  'HMT-C-M': { label: 'Commercial Manufacturing (C-M)', status: 'cup', detail: 'City of Hemet — Storage facility (personal, mini-storage) requires a Conditional Use Permit (Sec. 90-893 Commercial Zones Land Use Matrix, Item H.12; Secs. 90-4, 90-81)' },
  'HMT-B-P': { label: 'Business Park (BP)', status: 'banned', detail: 'City of Hemet — Storage facility (personal, mini-storage) not permitted (Sec. 90-1043 Manufacturing Zones Land Use Matrix, Item H.31; Secs. 90-4, 90-81)' },
  'HMT-M-1': { label: 'Limited Manufacturing (M-1)', status: 'cup', detail: 'City of Hemet — Storage facility (personal, mini-storage) requires a Conditional Use Permit (Sec. 90-1043 Manufacturing Zones Land Use Matrix, Item H.31; Secs. 90-4, 90-81)' },
  'HMT-M-2': { label: 'Heavy Manufacturing (M-2)', status: 'cup', detail: 'City of Hemet — Storage facility (personal, mini-storage) requires a Conditional Use Permit (Sec. 90-1043 Manufacturing Zones Land Use Matrix, Item H.31; Secs. 90-4, 90-81)' },
  // City of Indio — Title 17 Unified Development Code (Ord. 1782, eff. 10-22-2022), Table 2.04.02-1 (Non-Residential Zones) & Table 2.03.02-1 (Mixed-Use Zones) — "Mini-Storage Warehousing or Facility"
  'IND-IL': { label: 'Light Industrial (IL)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.04.02-1, UDC Ch. 2.04)' },
  'IND-IH': { label: 'Heavy Industrial (IH)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.04.02-1, UDC Ch. 2.04)' },
  'IND-RC': { label: 'Resort Commercial (RC)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.04.02-1, UDC Ch. 2.04)' },
  'IND-RR': { label: 'Resort/Recreation (RR)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.04.02-1, UDC Ch. 2.04)' },
  'IND-CN-14': { label: 'Connected Neighborhoods — 14 (CN-14)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.03.02-1, UDC Ch. 2.03)' },
  'IND-CN-20': { label: 'Connected Neighborhoods — 20 (CN-20)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.03.02-1, UDC Ch. 2.03)' },
  'IND-NC': { label: 'Neighborhood Center (NC)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.03.02-1, UDC Ch. 2.03)' },
  'IND-MUN': { label: 'Mixed-Use Neighborhood (MUN)', status: 'banned', detail: 'City of Indio — "Mini-Storage Warehousing or Facility" not permitted (Table 2.03.02-1, UDC Ch. 2.03)' },
}

function getZoneInfo(props) {
  const zone = props.zone_display || props.name || props.Zone || props.ZoningCode || props.ZoneCode || props.ZONECLASS || props.DetailCode || props.ZONING || ''
  const city = props.city || ''
  // Riverside County ZONING values sometimes carry a minimum-area suffix (e.g. "M-H-10", "C/V-5") — strip it for lookup
  const zoneBase = zone.replace(/-[\d\s/]+$/, '')
  const info = ZONE_INFO[zone] || ZONE_INFO[zoneBase] || { label: zone || 'Unknown Zone', status: 'unknown', detail: 'No storage data for this zone' }
  return { zone, city, ...info }
}

const STATUS_BADGE = {
  by_right:    { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',    text: '✅ Storage Allowed by Right' },
  cup:         { color: '#f97316', bg: 'rgba(249,115,22,0.15)',   text: '🟠 CUP Required' },
  banned:      { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    text: '🚫 Self-Storage Not Permitted' },
  pending_ban: { color: '#f472b6', bg: 'rgba(244,114,182,0.15)', text: '⏳ Pending Ban (2026)' },
  pil:         { color: '#b91c1c', bg: 'rgba(185,28,28,0.15)',   text: '🔻 Prime Industrial — Not Permitted' },
  unknown:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', text: '❓ No Data' },
  city_banned: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', text: '🚫 No Storage Zones in This City' },
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
  const cupLayerRef=useRef(null)
  const redLayerRef=useRef(null)
  const ipLayerRef=useRef(null)
  const orangeLayerRef=useRef(null)
  const cityBannedLayerRef=useRef(null)
  const riversideUnincorporatedCupLayerRef=useRef(null)
  const riversideUnincorporatedRedLayerRef=useRef(null)
  const riversideCityCupLayerRef=useRef(null)
  const riversideCityRedLayerRef=useRef(null)
  const morenoValleyGreenLayerRef=useRef(null)
  const morenoValleyCupLayerRef=useRef(null)
  const morenoValleyRedLayerRef=useRef(null)
  const coronaCupLayerRef=useRef(null)
  const coronaRedLayerRef=useRef(null)
  const menifeeGreenLayerRef=useRef(null)
  const menifeeCupLayerRef=useRef(null)
  const menifeeRedLayerRef=useRef(null)
  const temeculaGreenLayerRef=useRef(null)
  const temeculaCupLayerRef=useRef(null)
  const temeculaRedLayerRef=useRef(null)
  const jurupaValleyCupLayerRef=useRef(null)
  const jurupaValleyRedLayerRef=useRef(null)
  const murrietaCupLayerRef=useRef(null)
  const murrietaRedLayerRef=useRef(null)
  const hemetCupLayerRef=useRef(null)
  const hemetRedLayerRef=useRef(null)
  const indioRedLayerRef=useRef(null)
  const perrisGreenLayerRef=useRef(null)
  const perrisCupLayerRef=useRef(null)
  const perrisRedLayerRef=useRef(null)

  const [greenData,setGreenData]=useState(null)
  const [cityBannedData,setCityBannedData]=useState(null)
  const [cupData,setCupData]=useState(null)
  const [redData,setRedData]=useState(null)
  const [ipData,setIpData]=useState(null)
  const [pilData,setPilData]=useState(null)
  const [orangeData,setOrangeData]=useState(null)
  const [riversideUnincorporatedCupData,setRiversideUnincorporatedCupData]=useState(null)
  const [riversideUnincorporatedRedData,setRiversideUnincorporatedRedData]=useState(null)
  const [riversideCityCupData,setRiversideCityCupData]=useState(null)
  const [riversideCityRedData,setRiversideCityRedData]=useState(null)
  const [morenoValleyGreenData,setMorenoValleyGreenData]=useState(null)
  const [morenoValleyCupData,setMorenoValleyCupData]=useState(null)
  const [morenoValleyRedData,setMorenoValleyRedData]=useState(null)
  const [coronaCupData,setCoronaCupData]=useState(null)
  const [coronaRedData,setCoronaRedData]=useState(null)
  const [menifeeGreenData,setMenifeeGreenData]=useState(null)
  const [menifeeCupData,setMenifeeCupData]=useState(null)
  const [menifeeRedData,setMenifeeRedData]=useState(null)
  const [temeculaGreenData,setTemeculaGreenData]=useState(null)
  const [temeculaCupData,setTemeculaCupData]=useState(null)
  const [temeculaRedData,setTemeculaRedData]=useState(null)
  const [jurupaValleyCupData,setJurupaValleyCupData]=useState(null)
  const [jurupaValleyRedData,setJurupaValleyRedData]=useState(null)
  const [murrietaCupData,setMurrietaCupData]=useState(null)
  const [murrietaRedData,setMurrietaRedData]=useState(null)
  const [hemetCupData,setHemetCupData]=useState(null)
  const [hemetRedData,setHemetRedData]=useState(null)
  const [indioRedData,setIndioRedData]=useState(null)
  const [perrisGreenData,setPerrisGreenData]=useState(null)
  const [perrisCupData,setPerrisCupData]=useState(null)
  const [perrisRedData,setPerrisRedData]=useState(null)

  const [mapType,setMapType]=useState('dark')
  const [showParcel,setShowParcel]=useState(false)
  const [showGreen,setShowGreen]=useState(false)
  const [showCup,setShowCup]=useState(false)
  const [showRed,setShowRed]=useState(true)
  const [showPIL,setShowPIL]=useState(true)
  const [showOrange,setShowOrange]=useState(false)
  const [showRiversideUnincorporatedCup,setShowRiversideUnincorporatedCup]=useState(false)
  const [showRiversideUnincorporatedRed,setShowRiversideUnincorporatedRed]=useState(false)
  const [showRiversideCityCup,setShowRiversideCityCup]=useState(false)
  const [showRiversideCityRed,setShowRiversideCityRed]=useState(false)
  const [showMorenoValleyGreen,setShowMorenoValleyGreen]=useState(false)
  const [showMorenoValleyCup,setShowMorenoValleyCup]=useState(false)
  const [showMorenoValleyRed,setShowMorenoValleyRed]=useState(false)
  const [showCoronaCup,setShowCoronaCup]=useState(false)
  const [showCoronaRed,setShowCoronaRed]=useState(false)
  const [showMenifeeGreen,setShowMenifeeGreen]=useState(false)
  const [showMenifeeCup,setShowMenifeeCup]=useState(false)
  const [showMenifeeRed,setShowMenifeeRed]=useState(false)
  const [showTemeculaGreen,setShowTemeculaGreen]=useState(false)
  const [showTemeculaCup,setShowTemeculaCup]=useState(false)
  const [showTemeculaRed,setShowTemeculaRed]=useState(false)
  const [showJurupaValleyCup,setShowJurupaValleyCup]=useState(false)
  const [showJurupaValleyRed,setShowJurupaValleyRed]=useState(false)
  const [showMurrietaCup,setShowMurrietaCup]=useState(false)
  const [showMurrietaRed,setShowMurrietaRed]=useState(false)
  const [showHemetCup,setShowHemetCup]=useState(false)
  const [showHemetRed,setShowHemetRed]=useState(false)
  const [showIndioRed,setShowIndioRed]=useState(false)
  const [showPerrisGreen,setShowPerrisGreen]=useState(false)
  const [showPerrisCup,setShowPerrisCup]=useState(false)
  const [showPerrisRed,setShowPerrisRed]=useState(false)
  const [showLocations,setShowLocations]=useState(true)   // Feature 2
  const [filterCompanies,setFilterCompanies]=useState(new Set())  // Feature 4
  const [parcelPopup,setParcelPopup]=useState(null)
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
    fetch('/city_banned.geojson').then(r=>r.json()).then(setCityBannedData).catch(()=>{})
    fetch('/cup_all.geojson').then(r=>r.json()).then(setCupData).catch(()=>{})
    fetch('/red_all.geojson').then(r=>r.json()).then(setRedData).catch(()=>{})
    fetch('/ip_zones.geojson').then(r=>r.json()).then(setIpData).catch(()=>{})
    fetch('/industrial_overlay.geojson').then(r=>r.json()).then(setPilData).catch(()=>{})
    fetch('/orange_overlay.geojson').then(r=>r.json()).then(setOrangeData).catch(()=>{})
    fetch('/riverside_unincorporated_cup.geojson').then(r=>r.json()).then(setRiversideUnincorporatedCupData).catch(()=>{})
    fetch('/riverside_unincorporated_red.geojson').then(r=>r.json()).then(setRiversideUnincorporatedRedData).catch(()=>{})
    fetch('/riverside_city_cup.geojson').then(r=>r.json()).then(setRiversideCityCupData).catch(()=>{})
    fetch('/riverside_city_red.geojson').then(r=>r.json()).then(setRiversideCityRedData).catch(()=>{})
    fetch('/moreno_valley_green.geojson').then(r=>r.json()).then(setMorenoValleyGreenData).catch(()=>{})
    fetch('/moreno_valley_cup.geojson').then(r=>r.json()).then(setMorenoValleyCupData).catch(()=>{})
    fetch('/moreno_valley_red.geojson').then(r=>r.json()).then(setMorenoValleyRedData).catch(()=>{})
    fetch('/corona_cup.geojson').then(r=>r.json()).then(setCoronaCupData).catch(()=>{})
    fetch('/corona_red.geojson').then(r=>r.json()).then(setCoronaRedData).catch(()=>{})
    fetch('/menifee_green.geojson').then(r=>r.json()).then(setMenifeeGreenData).catch(()=>{})
    fetch('/menifee_cup.geojson').then(r=>r.json()).then(setMenifeeCupData).catch(()=>{})
    fetch('/menifee_red.geojson').then(r=>r.json()).then(setMenifeeRedData).catch(()=>{})
    fetch('/temecula_green.geojson').then(r=>r.json()).then(setTemeculaGreenData).catch(()=>{})
    fetch('/temecula_cup.geojson').then(r=>r.json()).then(setTemeculaCupData).catch(()=>{})
    fetch('/temecula_red.geojson').then(r=>r.json()).then(setTemeculaRedData).catch(()=>{})
    fetch('/jurupa_valley_cup.geojson').then(r=>r.json()).then(setJurupaValleyCupData).catch(()=>{})
    fetch('/jurupa_valley_red.geojson').then(r=>r.json()).then(setJurupaValleyRedData).catch(()=>{})
    fetch('/murrieta_cup.geojson').then(r=>r.json()).then(setMurrietaCupData).catch(()=>{})
    fetch('/murrieta_red.geojson').then(r=>r.json()).then(setMurrietaRedData).catch(()=>{})
    fetch('/hemet_cup.geojson').then(r=>r.json()).then(setHemetCupData).catch(()=>{})
    fetch('/hemet_red.geojson').then(r=>r.json()).then(setHemetRedData).catch(()=>{})
    fetch('/indio_red.geojson').then(r=>r.json()).then(setIndioRedData).catch(()=>{})
    fetch('/perris_green.geojson').then(r=>r.json()).then(setPerrisGreenData).catch(()=>{})
    fetch('/perris_cup.geojson').then(r=>r.json()).then(setPerrisCupData).catch(()=>{})
    fetch('/perris_red.geojson').then(r=>r.json()).then(setPerrisRedData).catch(()=>{})
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

  useEffect(()=>{renderLayer(cityBannedLayerRef,cityBannedData,true,'#7f1d1d','#dc2626',0.12)},[ cityBannedData,mapReady])
  useEffect(()=>{renderLayer(greenLayerRef,greenData,showGreen,'#22c55e','#16a34a',0.30)},[showGreen,greenData,mapReady])
  useEffect(()=>{renderLayer(cupLayerRef,cupData,showCup,'#f59e0b','#d97706',0.28)},[showCup,cupData,mapReady])
  useEffect(()=>{renderLayer(redLayerRef,redData,showRed,'#ef4444','#dc2626',0.30)},[showRed,redData,mapReady])
  useEffect(()=>{renderLayer(ipLayerRef,ipData,showRed,'#ef4444','#dc2626',0.26)},[showRed,ipData,mapReady])
  // PIL Crosshatch overlay
  const pilOverlayRef=useRef(null)
  useEffect(()=>{
    const map=mapRef.current
    if (!map||!window.google||!pilData) return
    if (pilOverlayRef.current) { pilOverlayRef.current.setMap(null); pilOverlayRef.current=null }
    if (!showPIL) return
    class CrosshatchOverlay extends window.google.maps.OverlayView {
      constructor(data){super();this.data=data;this.canvas=null;this.div=null}
      onAdd(){
        this.div=document.createElement('div')
        this.div.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;'
        this.canvas=document.createElement('canvas')
        this.canvas.style.cssText='position:absolute;pointer-events:none;'
        this.div.appendChild(this.canvas)
        this.getPanes().overlayLayer.appendChild(this.div)
      }
      draw(){
        if(!this.canvas)return
        const proj=this.getProjection()
        if(!proj)return
        const bounds=this.getMap().getBounds()
        if(!bounds)return
        const ne=proj.fromLatLngToDivPixel(bounds.getNorthEast())
        const sw=proj.fromLatLngToDivPixel(bounds.getSouthWest())
        const left=Math.round(sw.x),top2=Math.round(ne.y)
        const width=Math.round(ne.x-sw.x),height=Math.round(sw.y-ne.y)
        this.canvas.style.left=left+'px';this.canvas.style.top=top2+'px'
        this.canvas.width=width;this.canvas.height=height
        const ctx=this.canvas.getContext('2d')
        ctx.clearRect(0,0,width,height)
        const pc=document.createElement('canvas');pc.width=10;pc.height=10
        const pctx=pc.getContext('2d')
        pctx.strokeStyle='rgba(220,38,38,0.85)';pctx.lineWidth=2
        pctx.beginPath()
        pctx.moveTo(0,10);pctx.lineTo(10,0)
        pctx.moveTo(-1,1);pctx.lineTo(1,-1)
        pctx.moveTo(9,11);pctx.lineTo(11,9)
        pctx.stroke()
        const pattern=ctx.createPattern(pc,'repeat')
        this.data.features.forEach(feature=>{
          const geom=feature.geometry
          const polys=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates
          polys.forEach(coords=>{
            ctx.beginPath()
            coords.forEach((ring)=>{
              ring.forEach((pt,pi)=>{
                const px=proj.fromLatLngToDivPixel(new window.google.maps.LatLng(pt[1],pt[0]))
                const x=px.x-left,y=px.y-top2
                pi===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
              })
              ctx.closePath()
            })
            ctx.fillStyle=pattern;ctx.globalAlpha=0.65;ctx.fill('evenodd')
            ctx.globalAlpha=1;ctx.strokeStyle='#dc2626';ctx.lineWidth=1.5;ctx.stroke()
          })
        })
      }
      onRemove(){
        if(this.div&&this.div.parentNode)this.div.parentNode.removeChild(this.div)
        this.div=null;this.canvas=null
      }
    }
    const overlay=new CrosshatchOverlay(pilData)
    overlay.setMap(map)
    pilOverlayRef.current=overlay
  },[showPIL,pilData,mapReady])
  useEffect(()=>{renderLayer(orangeLayerRef,orangeData,showOrange,'#f472b6','#ec4899',0.30)},[showOrange,orangeData,mapReady])
  useEffect(()=>{renderLayer(riversideUnincorporatedCupLayerRef,riversideUnincorporatedCupData,showRiversideUnincorporatedCup,'#f97316','#ea580c',0.30)},[showRiversideUnincorporatedCup,riversideUnincorporatedCupData,mapReady])
  useEffect(()=>{renderLayer(riversideUnincorporatedRedLayerRef,riversideUnincorporatedRedData,showRiversideUnincorporatedRed,'#ef4444','#dc2626',0.22)},[showRiversideUnincorporatedRed,riversideUnincorporatedRedData,mapReady])
  useEffect(()=>{renderLayer(riversideCityCupLayerRef,riversideCityCupData,showRiversideCityCup,'#f59e0b','#d97706',0.28)},[showRiversideCityCup,riversideCityCupData,mapReady])
  useEffect(()=>{renderLayer(riversideCityRedLayerRef,riversideCityRedData,showRiversideCityRed,'#ef4444','#dc2626',0.30)},[showRiversideCityRed,riversideCityRedData,mapReady])
  useEffect(()=>{renderLayer(morenoValleyGreenLayerRef,morenoValleyGreenData,showMorenoValleyGreen,'#22c55e','#16a34a',0.30)},[showMorenoValleyGreen,morenoValleyGreenData,mapReady])
  useEffect(()=>{renderLayer(morenoValleyCupLayerRef,morenoValleyCupData,showMorenoValleyCup,'#f97316','#ea580c',0.30)},[showMorenoValleyCup,morenoValleyCupData,mapReady])
  useEffect(()=>{renderLayer(morenoValleyRedLayerRef,morenoValleyRedData,showMorenoValleyRed,'#ef4444','#dc2626',0.22)},[showMorenoValleyRed,morenoValleyRedData,mapReady])
  useEffect(()=>{renderLayer(coronaCupLayerRef,coronaCupData,showCoronaCup,'#f97316','#ea580c',0.30)},[showCoronaCup,coronaCupData,mapReady])
  useEffect(()=>{renderLayer(coronaRedLayerRef,coronaRedData,showCoronaRed,'#ef4444','#dc2626',0.22)},[showCoronaRed,coronaRedData,mapReady])
  useEffect(()=>{renderLayer(menifeeGreenLayerRef,menifeeGreenData,showMenifeeGreen,'#22c55e','#16a34a',0.30)},[showMenifeeGreen,menifeeGreenData,mapReady])
  useEffect(()=>{renderLayer(menifeeCupLayerRef,menifeeCupData,showMenifeeCup,'#f97316','#ea580c',0.30)},[showMenifeeCup,menifeeCupData,mapReady])
  useEffect(()=>{renderLayer(menifeeRedLayerRef,menifeeRedData,showMenifeeRed,'#ef4444','#dc2626',0.22)},[showMenifeeRed,menifeeRedData,mapReady])
  useEffect(()=>{renderLayer(temeculaGreenLayerRef,temeculaGreenData,showTemeculaGreen,'#22c55e','#16a34a',0.30)},[showTemeculaGreen,temeculaGreenData,mapReady])
  useEffect(()=>{renderLayer(temeculaCupLayerRef,temeculaCupData,showTemeculaCup,'#f97316','#ea580c',0.30)},[showTemeculaCup,temeculaCupData,mapReady])
  useEffect(()=>{renderLayer(temeculaRedLayerRef,temeculaRedData,showTemeculaRed,'#ef4444','#dc2626',0.22)},[showTemeculaRed,temeculaRedData,mapReady])
  useEffect(()=>{renderLayer(jurupaValleyCupLayerRef,jurupaValleyCupData,showJurupaValleyCup,'#f97316','#ea580c',0.30)},[showJurupaValleyCup,jurupaValleyCupData,mapReady])
  useEffect(()=>{renderLayer(jurupaValleyRedLayerRef,jurupaValleyRedData,showJurupaValleyRed,'#ef4444','#dc2626',0.22)},[showJurupaValleyRed,jurupaValleyRedData,mapReady])
  useEffect(()=>{renderLayer(murrietaCupLayerRef,murrietaCupData,showMurrietaCup,'#f97316','#ea580c',0.30)},[showMurrietaCup,murrietaCupData,mapReady])
  useEffect(()=>{renderLayer(murrietaRedLayerRef,murrietaRedData,showMurrietaRed,'#ef4444','#dc2626',0.22)},[showMurrietaRed,murrietaRedData,mapReady])
  useEffect(()=>{renderLayer(hemetCupLayerRef,hemetCupData,showHemetCup,'#f97316','#ea580c',0.30)},[showHemetCup,hemetCupData,mapReady])
  useEffect(()=>{renderLayer(hemetRedLayerRef,hemetRedData,showHemetRed,'#ef4444','#dc2626',0.22)},[showHemetRed,hemetRedData,mapReady])
  useEffect(()=>{renderLayer(indioRedLayerRef,indioRedData,showIndioRed,'#ef4444','#dc2626',0.22)},[showIndioRed,indioRedData,mapReady])
  useEffect(()=>{renderLayer(perrisGreenLayerRef,perrisGreenData,showPerrisGreen,'#22c55e','#16a34a',0.30)},[showPerrisGreen,perrisGreenData,mapReady])
  useEffect(()=>{renderLayer(perrisCupLayerRef,perrisCupData,showPerrisCup,'#f97316','#ea580c',0.30)},[showPerrisCup,perrisCupData,mapReady])
  useEffect(()=>{renderLayer(perrisRedLayerRef,perrisRedData,showPerrisRed,'#ef4444','#dc2626',0.22)},[showPerrisRed,perrisRedData,mapReady])

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
          showCup={showCup} setShowCup={setShowCup}
          showRed={showRed} setShowRed={setShowRed}
          showOrange={showOrange} setShowOrange={setShowOrange}
          showPIL={showPIL} setShowPIL={setShowPIL}
          showParcel={showParcel} setShowParcel={setShowParcel}
          showLocations={showLocations} setShowLocations={setShowLocations}
          showRiversideUnincorporatedCup={showRiversideUnincorporatedCup} setShowRiversideUnincorporatedCup={setShowRiversideUnincorporatedCup}
          showRiversideUnincorporatedRed={showRiversideUnincorporatedRed} setShowRiversideUnincorporatedRed={setShowRiversideUnincorporatedRed}
          showRiversideCityCup={showRiversideCityCup} setShowRiversideCityCup={setShowRiversideCityCup}
          showRiversideCityRed={showRiversideCityRed} setShowRiversideCityRed={setShowRiversideCityRed}
          showMorenoValleyGreen={showMorenoValleyGreen} setShowMorenoValleyGreen={setShowMorenoValleyGreen}
          showMorenoValleyCup={showMorenoValleyCup} setShowMorenoValleyCup={setShowMorenoValleyCup}
          showMorenoValleyRed={showMorenoValleyRed} setShowMorenoValleyRed={setShowMorenoValleyRed}
          showCoronaCup={showCoronaCup} setShowCoronaCup={setShowCoronaCup}
          showCoronaRed={showCoronaRed} setShowCoronaRed={setShowCoronaRed}
          showMenifeeGreen={showMenifeeGreen} setShowMenifeeGreen={setShowMenifeeGreen}
          showMenifeeCup={showMenifeeCup} setShowMenifeeCup={setShowMenifeeCup}
          showMenifeeRed={showMenifeeRed} setShowMenifeeRed={setShowMenifeeRed}
          showTemeculaGreen={showTemeculaGreen} setShowTemeculaGreen={setShowTemeculaGreen}
          showTemeculaCup={showTemeculaCup} setShowTemeculaCup={setShowTemeculaCup}
          showTemeculaRed={showTemeculaRed} setShowTemeculaRed={setShowTemeculaRed}
          showJurupaValleyCup={showJurupaValleyCup} setShowJurupaValleyCup={setShowJurupaValleyCup}
          showJurupaValleyRed={showJurupaValleyRed} setShowJurupaValleyRed={setShowJurupaValleyRed}
          showMurrietaCup={showMurrietaCup} setShowMurrietaCup={setShowMurrietaCup}
          showMurrietaRed={showMurrietaRed} setShowMurrietaRed={setShowMurrietaRed}
          showHemetCup={showHemetCup} setShowHemetCup={setShowHemetCup}
          showHemetRed={showHemetRed} setShowHemetRed={setShowHemetRed}
          showIndioRed={showIndioRed} setShowIndioRed={setShowIndioRed}
          showPerrisGreen={showPerrisGreen} setShowPerrisGreen={setShowPerrisGreen}
          showPerrisCup={showPerrisCup} setShowPerrisCup={setShowPerrisCup}
          showPerrisRed={showPerrisRed} setShowPerrisRed={setShowPerrisRed}
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
          <div style={{maxHeight:'160px',overflowY:'auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px',paddingRight:'2px'}}>
            {COMPANIES.map(co=>{
              const active=filterCompanies.has(co)
              const logoUrl=LOGO_URLS[co]
              return (
                <button key={co} onClick={()=>{
                  setFilterCompanies(prev=>{const next=new Set(prev);active?next.delete(co):next.add(co);return next})
                }} title={co} style={{
                  padding:'4px 3px',borderRadius:'5px',cursor:'pointer',
                  background:active?'rgba(96,165,250,0.18)':'#111827',
                  border:active?'1px solid rgba(96,165,250,0.5)':'1px solid #1e2d47',
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  minHeight:'32px',overflow:'hidden',
                }}>
                  {logoUrl?(
                    <img src={logoUrl} style={{width:'100%',height:'22px',objectFit:'contain',opacity:active?1:0.65}} />
                  ):(
                    <span style={{fontSize:'7px',color:active?'#60a5fa':'#475569',textAlign:'center',lineHeight:1.2,wordBreak:'break-word',padding:'0 2px'}}>{co}</span>
                  )}
                </button>
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
          <GoogleMap mapContainerStyle={{width:'100%',height:'100%'}} options={mapOptions} onLoad={onMapLoad}
            onClick={(e)=>{
              if (!showParcel) { setParcelPopup(null); return }
              const zoom=mapRef.current?.getZoom()
              if (zoom<14) { setParcelPopup(null); return }
              const lat=e.latLng.lat(),lng=e.latLng.lng()
              fetch('https://gis-public.sandiegocounty.gov/arcgis/rest/services/Lots/MapServer/0/query?geometry='+lng+','+lat+'&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json')
                .then(r=>r.json())
                .then(d=>{
                  const lotNo=d.features?.[0]?.attributes?.LOTNO||null
                  const geocoder=new window.google.maps.Geocoder()
                  geocoder.geocode({location:{lat,lng}},(results,status)=>{
                    const address=status==='OK'?results[0]?.formatted_address:null
                    setParcelPopup({lat,lng,lotNo,address})
                  })
                })
                .catch(()=>setParcelPopup({lat,lng,lotNo:null,address:null}))
            }}>
            {showLocations&&filteredProps.map(prop=>(
              prop.lat&&prop.lng?(
                <Marker key={prop.id} prop={prop} colorMode={colorMode}
                  onClick={setSelectedProperty} isSelected={selectedProperty?.id===prop.id}/>
              ):null
            ))}
            {showLocations&&leads.filter(l=>l.lat&&l.lng).map(lead=>(
              <LeadDot key={lead._docId} lead={lead}/>
            ))}
            {parcelPopup&&(
              <OverlayView position={{lat:parcelPopup.lat,lng:parcelPopup.lng}} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{background:'#0d1526',border:'1px solid #2d3f5e',borderRadius:'8px',padding:'10px 12px',minWidth:'210px',boxShadow:'0 4px 20px rgba(0,0,0,0.6)',transform:'translate(-50%,-110%)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                    <div style={{fontSize:'10px',color:'#60a5fa',fontWeight:700,letterSpacing:'0.05em'}}>PARCEL INFO</div>
                    <button onClick={()=>setParcelPopup(null)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'16px',lineHeight:1,padding:0}}>×</button>
                  </div>
                  {parcelPopup.address&&(
                    <div style={{fontSize:'11px',color:'#e2e8f0',marginBottom:'4px',lineHeight:1.3}}>{parcelPopup.address.replace(', USA','')}</div>
                  )}
                  {parcelPopup.lotNo&&(
                    <div style={{fontSize:'10px',color:'#94a3b8',marginBottom:'6px'}}>Lot No: {parcelPopup.lotNo}</div>
                  )}
                  <div style={{fontSize:'9px',color:'#475569',marginBottom:'8px',lineHeight:1.4}}>APN • Owner • Land size available via County Assessor</div>
                  <a href={'https://arcc.sdcounty.ca.gov/pages/property-search.aspx'+(parcelPopup.address?'?q='+encodeURIComponent(parcelPopup.address):'')}
                    target='_blank' rel='noreferrer'
                    style={{display:'block',textAlign:'center',padding:'6px',background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.3)',borderRadius:'5px',color:'#60a5fa',fontSize:'10px',textDecoration:'none',fontWeight:600}}>
                    View in County Assessor →
                  </a>
                </div>
              </OverlayView>
            )}
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
