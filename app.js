import { Api } from './api.js';

const state = {
  map: null,
  currentMode: 'trike',
  discountType: 'none',
  trike: {
    startMarker: null,
    endMarker: null,
    routeControl: null
  },
  busjeep: {
    routeControl: null,
    markers: [],
    selectedRoute: null,
    userMarker: null
  }
};

const ROUTES = {
  'uhaw': {
    name: 'Uhaw Route',
    color: '#10b981',
    stops: [
      [6.05767570956232, 125.10107993582126],
      [6.066884922625555, 125.1434596999282],
      [6.077595973054012, 125.14630932006035],
      [6.103867375918512, 125.15131957789644],
      [6.118545877545823, 125.16105536621555],
      [6.113102709883002, 125.1641208727235],
      [6.112729529261363, 125.17019837345096],
      [6.107332339041174, 125.17169075356206],
      [6.10715133832164, 125.17841548474036],
      [6.11504792768598, 125.1810033808399],
      [6.117269670385729, 125.18593755106797],
      [6.121359557284698, 125.19027992842483]
    ],
    labels: [
      "Airport", "Kanto Uhaw Station", "Jollibee", "GenSan May Logistics",
      "7-Eleven Bulaong", "Husky Terminal", "RD Plaza", "Pioneer Avenue",
      "Palengke", "SM", "KCC", "Robinsons"
    ]
  },
  'calumpang': {
    name: 'Calumpang Route',
    color: '#f59e0b',
    stops: [
      [6.078873108385696, 125.13528401472598],
      [6.077396262058303, 125.14070464684552],
      [6.077595973054012, 125.14630932006035],
      [6.107364931098272, 125.17185909281004],
      [6.1094378291354685, 125.17859477710057],
      [6.117269670385729, 125.18593755106797],
      [6.118803421745483, 125.19375059719822],
      [6.127613973270192, 125.19631931002468]
    ],
    labels: [
      "Lado Transco Terminal", "GenSan National High", "Western Oil",
      "Pioneer Ave", "Magsaysay UNITOP", "KCC", "Brigada Pharmacy",
      "Lagao Public Market"
    ]
  },
  'mabuhay': {
    name: 'Mabuhay Route',
    color: '#ffffff',
    stops: [
      [6.11752, 125.18612],
      [6.11658, 125.18520],
      [6.11514, 125.18107],
      [6.10745, 125.17857],
      [6.10721, 125.17180],
      [6.11263, 125.17029],
      [6.12117, 125.17136],
      [6.15283, 125.16705],
      [6.15466, 125.16342]
    ],
    labels: [
      "KCC Mall of Gensan", "SM Mall of Gensan", "Public Market", "Pioneer",
      "RD Plaza", "711 Malakas", "NLSA Road", "MGTC Terminal"
    ]
  }
};

function initPanelDrag() {
  const panel = document.getElementById('control-panel');
  const handle = document.querySelector('.panel-handle');
  
  if (!handle || window.innerWidth >= 1024) return;
  
  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  
  const handleStart = (e) => {
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    startY = touch.clientY;
    isDragging = true;
    panel.style.transition = 'none';
  };
  
  const handleMove = (e) => {
    if (!isDragging) return;
    
    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    currentY = touch.clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0 && !panel.classList.contains('minimized')) {
      panel.style.transform = `translateY(${deltaY}px)`;
    } else if (deltaY < 0 && panel.classList.contains('minimized')) {
      panel.style.transform = `translateY(calc(100% - 60px + ${deltaY}px))`;
    }
  };
  
  const handleEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    
    const deltaY = currentY - startY;
    
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        panel.classList.add('minimized');
        panel.classList.remove('expanded');
      } else {
        panel.classList.remove('minimized');
      }
    }
  };
  
  handle.addEventListener('touchstart', handleStart, { passive: true });
  document.addEventListener('touchmove', handleMove, { passive: true });
  document.addEventListener('touchend', handleEnd);
  
  handle.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  
  handle.addEventListener('click', (e) => {
    if (e.detail === 1) {
      panel.classList.toggle('minimized');
      panel.classList.remove('expanded');
    }
  });
}

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function formatLatLng(ll) {
  return `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
}

function createMarkerIcon(label, color) {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Space Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">${label}</div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

// ─── GENSAN KEY PLACES DATABASE ───────────────────────────────────────────────
const GENSAN_PLACES = [
  // Malls & Commercial
  { name: 'SM Mall of GenSan', lat: 6.11615, lng: 125.18107, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'KCC Mall of GenSan', lat: 6.11605, lng: 125.18691, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'Robinsons Mall of GenSan', lat: 6.12099, lng: 125.19069, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'Gaisano Mall of GenSan', lat: 6.11727, lng: 125.18437, tags: ['mall', 'shopping', 'restaurants'] },
  { name: 'Fit Mart Mall of GenSan', lat: 6.11237, lng: 125.16923, tags: ['mall', 'shopping'] },
  { name: 'Veranza Mall', lat: 6.11600, lng: 125.18852, tags: ['mall', 'arcade', 'restaurants'] },
  // Hospitals
  { name: 'St.Elizabeth Hospital', lat: 6.11821, lng: 125.17995, tags: ['Hospital', 'Clinic'] },
  { name: 'GenSan Doctors Hospital', lat: 6.12011, lng: 125.17839, tags: ['Hospital', 'Clinic'] },
  { name: 'Mindanao Medical Center', lat: 6.12801, lng: 125.15985, tags: ['Hospital', 'Clinic'] },
  { name: 'Dadiangas Medical Center', lat: 6.12465, lng: 125.17772, tags: ['Hospital', 'Clinic'] },
  { name: 'Dr. Jorge P. Royeca Hospital', lat: 6.12568, lng: 125.18583, tags: ['Hospital', 'Clinic'] },
  { name: 'Socsargen County Hospital', lat: 6.11827, lng: 125.18984, tags: ['Hospital', 'Clinic'] },
  { name: 'Gensan Medical Center', lat: 6.08247, lng: 125.14768, tags: ['Hospital', 'Clinic'] },
  { name: 'Peuriculture Hospital', lat: 6.11360, lng: 125.17121, tags: ['Hospital', 'Clinic'] },
  { name: 'Auguis Clinic & Hospital', lat: 6.11299, lng: 125.16777, tags: ['Hospital', 'Clinic'] },
  { name: 'R. O. Diagan Community Hospital', lat: 6.11447, lng: 125.16717, tags: ['Hospital', 'Clinic'] },
  { name: 'Yap clinic', lat: 6.11536, lng: 125.17336, tags: ['Clinic'] },
  { name: 'Mercury Drugstore, Irineo Santiago Boulevard', lat: 6.11779, lng: 125.17973, tags: ['Pharmacy'] },
  { name: 'Decolongon Pharmacy', lat: 6.11821, lng: 125.17912, tags: ['Pharmacy'] },
  { name: 'Navis Pharmacy', lat: 6.11289, lng: 125.16905, tags: ['Pharmacy'] },
  { name: 'Mercury Drugstore, Pioneer ', lat: 6.10889, lng: 125.17153, tags: ['Pharmacy'] },
  { name: 'Rosa Pharmacy, Pioneer', lat: 6.10903, lng: 125.17147, tags: ['Pharmacy'] },
  { name: 'Rose Pharmacy, Digos-Makar Road', lat: 6.11913, lng: 125.17960, tags: ['Pharmacy'] },
  { name: 'Rojon Pharmacy, Cagampang Street', lat: 6.10844, lng: 125.17971, tags: ['Pharmacy'] },
  // Schools / Universities
  { name: 'Goldenstate Little College, Malakas', lat: 6.13820, lng: 125.16848, tags: ['GLC', 'School'] },
  { name: 'Montessori School of General Santos City', lat: 6.13605, lng: 125.16522, tags: ['School'] },
  { name: 'Lagao National High School', lat: 6.13483, lng: 125.17133, tags: ['School'] },
  { name: 'New Era University', lat: 6.13672, lng: 125.17091, tags: ['School', 'University'] },
  { name: 'Quantum Academy Inc.', lat: 6.13914, lng: 125.17980, tags: ['School'] },
  { name: 'GSC SPED Integrated School, Lagao', lat: 6.14550, lng: 125.18554, tags: ['School'] },
  { name: 'Lagao National High School – Annex', lat: 6.14475, lng: 125.18569, tags: ['School'] },
  { name: 'STI College, GenSan', lat: 6.11471, lng: 125.18297, tags: ['School'] },
  { name: 'Stratford International School', lat: 6.11359, lng: 125.18419, tags: ['School'] },
  { name: 'Notre Dame of Dadiangas University', lat: 6.11748, lng: 125.17165, tags: ['NDDU', 'University'] },
  { name: 'Mindanao State University - General Santos', lat: 6.11652, lng: 125.17171, tags: ['MSU', 'University'] },
  { name: 'RMMC School', lat: 6.11175, lng: 125.17388, tags: ['Ramon', 'School'] },
  { name: 'Goldenstate College, Acharon Boulevard', lat: 6.10716, lng: 125.17251, tags: ['GLC', 'School'] },
  { name: 'GSC SPED Integrated School, Quezon', lat: 6.11041, lng: 125.16766, tags: ['School'] },
  { name: 'Holy Trinity College', lat: 6.11334, lng: 125.16877, tags: ['School'] },
  { name: 'Dadiangas North Elementary School', lat: 6.11583, lng: 125.16735, tags: ['School'] },
  { name: 'Dadiangas East Elementary School', lat: 6.11625, lng: 125.17703, tags: ['School'] },
  { name: 'Dadiangas South Central Elementary School', lat: 6.11035, lng: 125.17582, tags: ['School'] },
  { name: 'Dadiangas West Central Elementary School', lat: 6.10963, lng: 125.16911, tags: ['School'] },
  { name: 'Notre Dame Dadiangas University, Lagao Gensan', lat: 6.12437, lng: 125.19643, tags: ['University', 'NDDU'] },
  // Transport / Terminals
  { name: 'Bulaong Terminal', lat: 6.11335, lng: 125.16237, tags: ['Bus', 'Van'] },
  { name: 'Husky Terminal', lat: 6.11326, lng: 125.16428, tags: ['Bus', 'Transport', 'Delivery'] },
  { name: 'Yellow Bus Terminal, Gensan', lat: 6.11950, lng: 125.17742, tags: ['Bus'] },
  { name: 'KCC Van Terminal, Gensan', lat: 6.11609, lng: 125.18948, tags: ['Van'] },
  { name: 'Lagao Public Terminal', lat: 6.12740, lng: 125.19633, tags: ['Van', 'Bus', 'Jeep'] },
  { name: 'International Airport, GenSan', lat: 6.05762, lng: 125.10083, tags: ['Airport', 'Plane'] },
  { name: 'Port of General Santos', lat: 6.09277, lng: 125.15536, tags: ['Port', 'Boat', 'Ferry'] },
  // Government
  { name: 'City Hall of GenSan', lat: 6.11302, lng: 125.17173, tags: ['Government'] },
  { name: 'Senior Citizens Office, GenSan', lat: 6.11440, lng: 125.17221, tags: ['Government'] },
  { name: 'General Santos City Public Library', lat: 6.11456, lng: 125.17184, tags: ['Government', 'Library'] },
  { name: 'Fire Station, GenSan', lat: 6.11457, lng: 125.17067, tags: ['Government', 'Fire Station', 'Emergency'] },
  { name: 'Police Station 1, GenSan', lat: 6.11396, lng: 125.17063, tags: ['Government', 'Emergency', 'Police'] },
  { name: 'Legislative Building, Gensan', lat: 6.11322, lng: 125.17298, tags: ['Government'] },
  { name: 'Philippine Statistics Authority, Gensan', lat: 6.11384, lng: 125.18006, tags: ['PSA', 'Government'] },
  { name: 'National Bureau of Investigation,Gensan', lat: 6.12568, lng: 125.19250, tags: ['BRI', 'Government'] },
  { name: 'Hall of Justice, Gensan', lat: 6.12657, lng: 125.19856, tags: ['Government'] },
  // Markets
  { name: 'GenSan Public Market', lat: 6.10790, lng: 125.17848, tags: ['Market'] },
  { name: ' Bagsakan Market', lat: 6.11017, lng: 125.18225, tags: ['Market'] },
  { name: 'SM Savemore Market,  Yumang', lat: 6.13274, lng: 125.16061, tags: ['Market'] },
  { name: 'SM Savemore Market,  Nuñez ', lat: 6.13831, lng: 125.17002, tags: ['Market'] },
  { name: 'Lagao Public Market', lat: 6.12732, lng: 125.19660, tags: ['Market'] },
  { name: 'SM Savemore Market, Calumpang', lat: 6.07740, lng: 125.14651, tags: ['Market'] },
  // Parks & Landmarks
  { name: 'Carlos P. Garcia Freedom Park', lat: 6.11538, lng: 125.17177, tags: ['Park', 'Plaza'] },
  { name: 'Plaza Heneral Santos', lat: 6.11214, lng: 125.17179, tags: ['Park', 'Plaza'] },
  { name: 'Queen Tuna Park', lat: 6.10678, lng: 125.17574, tags: ['Park', 'Beach'] },
  { name: 'Pacman Mansion 2', lat: 6.12767, lng: 125.16759, tags: ['Landmark'] },
  { name: 'Japanese abandoned World War 2 Bunker', lat: 6.14836, lng: 125.15902, tags: ['Landmark', 'Historical'] },
  { name: 'Pacman Mansion', lat: 6.13345, lng: 125.18503, tags: ['Landmark'] },
  { name: 'Lagao Gym,', lat: 6.13178, lng: 125.18373, tags: ['Gymnasium', 'landmark'] },
  // Hotels
  { name: 'Green Leaf Hotel', lat: 6.11470, lng: 125.18220, tags: ['Hotel', 'Pool', 'Restaurant', 'Venue'] },
  { name: 'Grand Imperial Hotel', lat: 6.11970, lng: 125.18958, tags: ['Hotel', 'Pool', 'Casino', 'Venue'] },
  { name: 'T Boli Hotel', lat: 6.11903, lng: 125.17770, tags: ['Hotel'] },
  { name: 'Tierra Montana Hotel', lat: 6.11894, lng: 125.17629, tags: ['Hotel'] },
  { name: 'Florotel', lat: 6.11601, lng: 125.17001, tags: ['Hotel'] },
  { name: 'Pearl Suites', lat: 6.12875, lng: 125.18166, tags: ['Hotel'] },
  { name: 'Phela Grande Hotel', lat: 6.10943, lng: 125.17037, tags: ['Hotel'] },
  { name: 'Sydney Hotel', lat: 6.11129, lng: 125.17133, tags: ['Hotel'] },
  { name: 'Hotel Dolores', lat: 6.10896, lng: 125.17936, tags: ['Hotel'] },
  { name: 'Sun City Suites', lat: 6.11906, lng: 125.18320, tags: ['Hotel', 'Suites'] },
  { name: 'Microtel Inn & Suites', lat: 6.12005, lng: 125.17986, tags: ['Hotel', 'Inn', 'Suites'] },
  { name: 'Zanrock Hotel', lat: 6.12683, lng: 125.19278, tags: ['Hotel'] },
  { name: 'Agents Lodging House', lat: 6.12581, lng: 125.19303, tags: ['Hotel', 'Suites'] },
  { name: 'Alonzo Pensionne', lat: 6.11829, lng: 125.19305, tags: ['Hotel', 'Guest house'] },
  { name: 'Have Pension Hauz', lat: 6.11474, lng: 125.17492, tags: ['Hotel', 'Guest house'] },
  { name: 'Casa Rafael Business Inn', lat: 6.11267, lng: 125.17709, tags: ['Hotel'] },
  { name: 'Soler Hotel', lat: 6.11394, lng: 125.17923, tags: ['Hotel'] },
  { name: 'Hotel Filipino', lat: 6.11430, lng: 125.17924, tags: ['Hotel'] },
  { name: 'Jovinaj Travellers Inn', lat: 6.11132, lng: 125.18577, tags: ['Hotel', 'Inn'] },
  { name: 'Matutum Hotel & Restaurant', lat: 6.10709, lng: 125.17347, tags: ['Hotel', 'Restaurant'] },
  { name: 'Roadhaus hotel', lat: 6.12249, lng: 125.17192, tags: ['Hotel'] },
  // Restaurant
  { name: 'McDonalds, Digos-Makar Road', lat: 6.11912, lng: 125.17981, tags: ['restaurant', 'fastfood'] },
  { name: 'Chowking, Digos-Makar Road', lat: 6.11909, lng: 125.17925, tags: ['restaurant', 'fastfood'] },
  { name: 'Mang Inasal, Digos-Makar Road', lat: 6.11911, lng: 125.17880, tags: ['restaurant', 'fastfood'] },
  { name: 'Jollibee, Digos-Makar Road', lat: 6.11854, lng: 125.17887, tags: ['restaurant', 'fastfood'] },
  { name: 'Jollibee, Pendatun Avenue', lat: 6.11265, lng: 125.17032, tags: ['restaurant', 'fastfood'] },
  { name: 'PBA Restaurant, Digos-Makar Road', lat: 6.11907, lng: 125.17258, tags: ['restaurant'] },
  { name: 'Dunkin Donuts, Digos-Makar Road', lat: 6.11901, lng: 125.17276, tags: ['restaurant', 'cafe', 'donuts'] },
  { name: 'Jollibee, Hadano Avenue', lat: 6.11877, lng: 125.14512, tags: ['restaurant', 'fastfood'] },
  { name: 'McDonalds, Jose Catolico Sr. Avenue', lat: 6.12625, lng: 125.19532, tags: ['restaurant', 'fastfood'] },
  { name: 'Jollibee, Jose Catolico Sr. Avenue', lat: 6.12703, lng: 125.19527, tags: ['restaurant', 'fastfood'] },
  { name: 'Starbucks - GenSan Highway', lat: 6.11924, lng: 125.18453, tags: ['restaurant', 'cafe', 'coffee'] },
  { name: 'Ponti Cafe, Digos-Makar Road', lat: 6.11910, lng: 125.18422, tags: ['restaurant', 'cafe'] },
  { name: 'Burger King, Digos-Makar Road', lat: 6.11906, lng: 125.18049, tags: ['restaurant', 'fastfood'] },
  { name: 'Gaisano Supermarket, Digos-Makar Road', lat: 6.11765, lng: 125.18393, tags: ['market', 'supermarket'] },
];

// ─── SEARCH HISTORY ────────────────────────────────────────────────────────────
const MAX_HISTORY = 4;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem('geoGensan_searchHistory') || '[]');
  } catch { return []; }
}

function addToSearchHistory(place) {
  let history = getSearchHistory();
  // Remove duplicates
  history = history.filter(h => h.name !== place.name);
  history.unshift({ name: place.name, lat: place.lat, lng: place.lng });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem('geoGensan_searchHistory', JSON.stringify(history));
}

// ─── AUTOCOMPLETE ──────────────────────────────────────────────────────────────
function searchLocalPlaces(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored = GENSAN_PLACES.map(place => {
    const nameLower = place.name.toLowerCase();
    let score = 0;
    if (nameLower.startsWith(q)) score = 100;
    else if (nameLower.includes(q)) score = 70;
    else if (place.tags.some(t => t.includes(q))) score = 50;
    else if (place.tags.some(t => q.includes(t))) score = 30;
    return { ...place, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
}

// Track which input currently owns the open dropdown
let _activeAutocompleteInput = null;

function closeAllAutocompletes() {
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.remove());
  _activeAutocompleteInput = null;
}

// One global listener to close dropdowns when clicking outside any search field
document.addEventListener('click', (e) => {
  // If the click is inside an autocomplete dropdown or an input-content wrapper, keep it open
  if (e.target.closest('.autocomplete-dropdown') || e.target.closest('.input-content')) return;
  closeAllAutocompletes();
}, true);

function createAutocompleteDropdown(inputEl, onSelect) {
  // Close any dropdown belonging to the OTHER input first
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
    // Only remove dropdowns not belonging to this input's wrapper
    const wrapper = inputEl.closest('.input-content') || inputEl.parentElement;
    if (!wrapper.contains(d)) d.remove();
  });

  const wrapper = inputEl.closest('.input-content') || inputEl.parentElement;

  // Remove existing dropdown for this field
  const old = wrapper.querySelector('.autocomplete-dropdown');
  if (old) old.remove();

  _activeAutocompleteInput = inputEl;

  const query = inputEl.value.trim();
  const history = getSearchHistory();

  let results = [];
  if (!query) {
    // Show recent searches only (up to MAX_HISTORY)
    results = history.map(h => ({ ...h, isHistory: true }));
  } else {
    results = searchLocalPlaces(query);
  }

  if (!results.length) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';

  if (!query && results.length) {
    const header = document.createElement('div');
    header.className = 'autocomplete-header';
    header.textContent = '🕐 Recent Searches';
    dropdown.appendChild(header);
  }

  results.forEach(place => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.innerHTML = `
      <span class="autocomplete-icon">${place.isHistory ? '🕐' : '📍'}</span>
      <span class="autocomplete-name">${place.name}</span>
    `;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(place);
      closeAllAutocompletes();
    });
    // Touch support
    item.addEventListener('touchend', (e) => {
      e.preventDefault();
      onSelect(place);
      closeAllAutocompletes();
    });
    dropdown.appendChild(item);
  });

  wrapper.style.position = 'relative';
  wrapper.appendChild(dropdown);
}

function removeAutocomplete(inputEl) {
  const wrapper = inputEl.closest('.input-content') || inputEl.parentElement;
  const dd = wrapper.querySelector('.autocomplete-dropdown');
  if (dd) dd.remove();
  if (_activeAutocompleteInput === inputEl) _activeAutocompleteInput = null;
}

async function reverseGeocode(latlng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const addr = data.address || {};
    
    // Try to get a human-friendly name from display_name parts
    const name = data.name || '';
    const road = addr.road || addr.pedestrian || addr.footway || '';
    const suburb = addr.suburb || addr.village || addr.neighbourhood || addr.quarter || '';
    const district = addr.city_district || addr.district || '';
    
    const parts = [];
    if (name && name !== road) parts.push(name);
    if (road) parts.push(road);
    if (suburb) parts.push(suburb);
    else if (district) parts.push(district);
    
    if (parts.length > 0) return parts.slice(0, 2).join(', ');
    
    // Fall back to display_name first two segments
    if (data.display_name) {
      const segments = data.display_name.split(',').map(s => s.trim()).filter(Boolean);
      return segments.slice(0, 2).join(', ');
    }
    
    return formatLatLng(latlng);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return formatLatLng(latlng);
  }
}

// South Cotabato / Region XII bounding box
// Covers General Santos, Koronadal, Surallah, Tupi, Polomolok, Tampakan, T'boli, Lake Sebu, etc.
// approx: lon 124.55–125.45, lat 5.85–6.55
const REGION12_VIEWBOX = '124.55,5.85,125.45,6.55';

// Check if a Nominatim result is within Region XII / South Cotabato area
function isWithinRegion12(lat, lng) {
  return lat >= 5.85 && lat <= 6.55 && lng >= 124.55 && lng <= 125.45;
}

async function geocodeWithNominatim(query) {
  try {
    // Attempt 1: query + South Cotabato context, bounded to region
    const url1 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', South Cotabato, Philippines')}&viewbox=${REGION12_VIEWBOX}&bounded=1&limit=5&addressdetails=1&namedetails=1`;
    const res1 = await fetch(url1, { headers: { 'Accept-Language': 'en' } });
    const data1 = await res1.json();
    const valid1 = data1.filter(r => isWithinRegion12(parseFloat(r.lat), parseFloat(r.lon)));
    if (valid1.length > 0) {
      return { lat: parseFloat(valid1[0].lat), lng: parseFloat(valid1[0].lon), name: valid1[0].display_name.split(',')[0] };
    }

    // Attempt 2: query alone, still bounded to region
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${REGION12_VIEWBOX}&bounded=1&limit=5&addressdetails=1`;
    const res2 = await fetch(url2, { headers: { 'Accept-Language': 'en' } });
    const data2 = await res2.json();
    const valid2 = data2.filter(r => isWithinRegion12(parseFloat(r.lat), parseFloat(r.lon)));
    if (valid2.length > 0) {
      return { lat: parseFloat(valid2[0].lat), lng: parseFloat(valid2[0].lon), name: valid2[0].display_name.split(',')[0] };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function geocode(query) {
  // First: check local places database
  const localResults = searchLocalPlaces(query);
  if (localResults.length > 0 && localResults[0].score >= 70) {
    const place = localResults[0];
    addToSearchHistory(place);
    return L.latLng(place.lat, place.lng);
  }
  
  // Then: try Nominatim
  const result = await geocodeWithNominatim(query);
  if (result) {
    addToSearchHistory({ name: result.name || query, lat: result.lat, lng: result.lng });
    return L.latLng(result.lat, result.lng);
  }
  
  showToast('❌ Location not found');
  return null;
}

// ─── FIREBASE + IMGBB CONFIG ───────────────────────────────────────────────────
const FIREBASE_DB_URL = 'https://gentrike-75c7c-default-rtdb.asia-southeast1.firebasedatabase.app';
const IMGBB_API_KEY   = '7416acef89ebb625100b3bf7a580770a';
const LAST_REPORT_KEY = 'geoGensan_lastReportTime';
const MAX_REPORTS     = 100;
const COOLDOWN_MS     = 2 * 60 * 60 * 1000; // 2 hours

// ── ImgBB upload ──────────────────────────────────────────────────────────────
async function uploadToImgBB(base64DataUrl) {
  // Strip the "data:image/...;base64," prefix
  const base64 = base64DataUrl.split(',')[1];
  const formData = new FormData();
  formData.append('image', base64);
  formData.append('key', IMGBB_API_KEY);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('ImgBB upload failed: ' + (data.error?.message || 'unknown'));
}

// ── Firebase Realtime Database helpers ───────────────────────────────────────
async function fbPush(path, value) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error('Firebase write failed: ' + res.status);
  return res.json(); // returns { name: "-generatedKey" }
}

async function fbGetAll(path) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`);
  if (!res.ok) throw new Error('Firebase read failed: ' + res.status);
  const data = await res.json();
  if (!data) return [];
  // Convert object of objects → sorted array (newest first by timestamp)
  return Object.entries(data)
    .map(([key, val]) => ({ _key: key, ...val }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function fbDelete(path) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Firebase delete failed: ' + res.status);
}

async function fbCount(path) {
  // Use shallow=true to just get keys without full data (faster)
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json?shallow=true`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data ? Object.keys(data).length : 0;
}

// ── Enforce 100-report cap (delete oldest if over limit) ─────────────────────
async function enforceReportCap() {
  const res = await fetch(`${FIREBASE_DB_URL}/reports.json`);
  if (!res.ok) return;
  const data = await res.json();
  if (!data) return;

  const entries = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);
  if (entries.length > MAX_REPORTS) {
    const toDelete = entries.slice(0, entries.length - MAX_REPORTS);
    await Promise.all(toDelete.map(([key]) => fbDelete(`reports/${key}`)));
  }
}

// ─── COMPLAINT SYSTEM ─────────────────────────────────────────────────────────
function canSubmitReport() {
  const last = parseInt(localStorage.getItem(LAST_REPORT_KEY) || '0');
  return Date.now() - last >= COOLDOWN_MS;
}

function getRemainingCooldown() {
  const last = parseInt(localStorage.getItem(LAST_REPORT_KEY) || '0');
  const remaining = COOLDOWN_MS - (Date.now() - last);
  return remaining > 0 ? remaining : 0;
}

function formatCooldown(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

let cooldownInterval = null;
let pendingImageData = null; // holds base64 data URL of selected image
let pendingImageFile = null; // holds the original File object

function initComplaintModal() {
  const openBtn      = document.getElementById('open-complaint');
  const modal        = document.getElementById('complaint-modal');
  const closeBtn     = document.getElementById('close-complaint');
  const submitBtn    = document.getElementById('submit-complaint');
  const descTextarea = document.getElementById('complaint-desc');
  const descCount    = document.getElementById('desc-count');

  // Image drop zone elements
  const dropZone   = document.getElementById('image-drop-zone');
  const fileInput  = document.getElementById('complaint-image-input');
  const dropIdle   = document.getElementById('drop-zone-idle');
  const dropPreview = document.getElementById('drop-zone-preview');
  const imgPreview = document.getElementById('complaint-img-preview');
  const removeBtn  = document.getElementById('drop-remove-img');

  function resetImageState() {
    pendingImageData = null;
    pendingImageFile = null;
    if (dropIdle)    dropIdle.style.display = 'flex';
    if (dropPreview) dropPreview.style.display = 'none';
    if (imgPreview)  imgPreview.src = '';
    if (fileInput)   fileInput.value = '';
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('❌ Please select a valid image file'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ Image must be under 5MB'); return;
    }
    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImageData = e.target.result;
      imgPreview.src = pendingImageData;
      dropIdle.style.display = 'none';
      dropPreview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  if (dropZone) {
    dropIdle.addEventListener('click', () => fileInput && fileInput.click());
    fileInput && fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleImageFile(e.target.files[0]);
    });
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault(); dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetImageState(); });
  }

  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    updateCooldownUI();
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    clearInterval(cooldownInterval);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) { modal.style.display = 'none'; clearInterval(cooldownInterval); }
  });

  descTextarea.addEventListener('input', () => {
    descCount.textContent = descTextarea.value.length;
  });

  submitBtn.addEventListener('click', async () => {
    const plate = document.getElementById('complaint-plate').value.trim();
    const type  = document.getElementById('complaint-type').value;
    const desc  = document.getElementById('complaint-desc').value.trim();

    if (!plate && !pendingImageData) { showToast('❌ Enter a plate number or attach a photo'); return; }
    if (!type)  { showToast('❌ Please select a report type'); return; }
    if (!desc)  { showToast('❌ Please enter a description'); return; }
    if (!canSubmitReport()) { showToast('⏳ Please wait before submitting again'); return; }

    // Disable button and show uploading state
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Submitting...';

    try {
      // 1. Upload image to ImgBB if one was attached
      let imageUrl = null;
      if (pendingImageData) {
        showToast('📤 Uploading photo...', 10000);
        imageUrl = await uploadToImgBB(pendingImageData);
      }

      // 2. Push report to Firebase
      const report = {
        plate: plate.toUpperCase() || '(photo only)',
        type,
        description: desc,
        imageUrl: imageUrl || null,
        timestamp: Date.now(),
        date: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
      };
      await fbPush('reports', report);

      // 3. Enforce 100-report cap in background
      enforceReportCap();

      // 4. Record cooldown locally
      localStorage.setItem(LAST_REPORT_KEY, Date.now().toString());

      // 5. Reset form
      document.getElementById('complaint-plate').value = '';
      document.getElementById('complaint-type').value = '';
      document.getElementById('complaint-desc').value = '';
      descCount.textContent = '0';
      resetImageState();

      modal.style.display = 'none';
      showToast('✅ Report submitted!', 3000);
      updateCooldownUI();

    } catch (err) {
      console.error('Submit error:', err);
      showToast('❌ Submission failed. Check your connection.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Report';
    }
  });
}

function updateCooldownUI() {
  const notice   = document.getElementById('complaint-cooldown-notice');
  const timerEl  = document.getElementById('cooldown-timer');
  const submitBtn = document.getElementById('submit-complaint');

  clearInterval(cooldownInterval);

  if (!canSubmitReport()) {
    notice.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';

    const tick = () => {
      const rem = getRemainingCooldown();
      if (rem <= 0) {
        clearInterval(cooldownInterval);
        notice.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
      }
      timerEl.textContent = formatCooldown(rem);
    };
    tick();
    cooldownInterval = setInterval(tick, 1000);
  } else {
    notice.style.display = 'none';
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
}

// ─── ADMIN PANEL ───────────────────────────────────────────────────────────────
// Admin panel is now a standalone page (admin.html) with its own login gate.
function initAdminPanel() {
  // No-op: admin login is handled entirely in admin.html
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initMap() {
  const map = L.map('map', {
    zoomControl: true,
    minZoom: 8,
    maxZoom: 19
  }).setView([6.116, 125.171], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Custom pane for the dark overlay - sits between tile layer and route lines
  map.createPane('darkOverlayPane');
  map.getPane('darkOverlayPane').style.zIndex = 250;
  map.getPane('darkOverlayPane').style.pointerEvents = 'none';

  // Custom pane for bus route lines - above the dark overlay
  map.createPane('busRoutePane');
  map.getPane('busRoutePane').style.zIndex = 420;
  map.getPane('busRoutePane').style.pointerEvents = 'none';

  // Custom pane for bus stop markers - above route lines
  map.createPane('busMarkerPane');
  map.getPane('busMarkerPane').style.zIndex = 440;

  state.map = map;
  map.on('click', handleMapClick);
  setTimeout(() => map.invalidateSize(), 100);
  
  return map;
}

function handleMapClick(e) {
  if (state.currentMode !== 'trike') return;

  const { startMarker, endMarker } = state.trike;

  if (!startMarker) {
    state.trike.startMarker = L.marker(e.latlng, {
      draggable: true,
      icon: createMarkerIcon('A', '#10b981')
    }).addTo(state.map);
    
    state.trike.startMarker.on('dragend', updateTrikeRoute);
    showToast('📍 Start point set');
  } else if (!endMarker) {
    state.trike.endMarker = L.marker(e.latlng, {
      draggable: true,
      icon: createMarkerIcon('B', '#ef4444')
    }).addTo(state.map);
    
    state.trike.endMarker.on('dragend', updateTrikeRoute);
    showToast('🎯 Calculating route...');
  } else {
    state.trike.startMarker.setLatLng(state.trike.endMarker.getLatLng());
    state.trike.endMarker.setLatLng(e.latlng);
    showToast('🔄 Route updated');
  }
  
  updateTrikeRoute();
}

async function updateTrikeRoute() {
  const { startMarker, endMarker } = state.trike;
  const startEl = document.getElementById('start-display');
  const endEl = document.getElementById('end-display');

  if (!startMarker && !endMarker) return;

  if (startMarker) {
    const addr = await reverseGeocode(startMarker.getLatLng());
    startEl.textContent = addr;
    startEl.classList.remove('is-placeholder');
    startEl.style.display = '';
  }

  if (endMarker) {
    const addr = await reverseGeocode(endMarker.getLatLng());
    endEl.textContent = addr;
    endEl.classList.remove('is-placeholder');
    endEl.style.display = '';
  }

  if (startMarker && endMarker) {
    clearTrikeRoute();
    showLoading();
    
    const waypoints = [
      startMarker.getLatLng(),
      endMarker.getLatLng()
    ];

    state.trike.routeControl = L.Routing.control({
      waypoints,
      lineOptions: {
        styles: [{
          color: '#2563eb',
          weight: 6,
          opacity: 0.8
        }]
      },
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false
    }).addTo(state.map);

    state.trike.routeControl.on('routesfound', async (e) => {
      hideLoading();
      const routes = e.routes;
      const summary = routes[0].summary;
      
      const distanceKm = summary.totalDistance / 1000;
      document.getElementById('distance-display').textContent = `${distanceKm.toFixed(2)} km`;
      
      const fareData = await Api.computeFare({ 
        mode: 'trike', 
        distanceKm,
        discountType: state.discountType 
      });
      
      displayFare(fareData);
      expandPanelOnMobile();
    });

    state.trike.routeControl.on('routingerror', () => {
      hideLoading();
      showToast('❌ Could not find route');
    });
  }
}

function expandPanelOnMobile() {
  if (window.innerWidth < 1024) {
    const panel = document.getElementById('control-panel');
    panel.classList.remove('minimized');
    panel.classList.add('expanded');
    showToast('📊 Fare calculated!', 1500);
  }
}

function displayFare(fareData) {
  const fareDisplay = document.getElementById('fare-display');
  const fareBreakdown = document.getElementById('fare-breakdown');
  const regularFareEl = document.getElementById('regular-fare');
  const discountLabelEl = document.getElementById('discount-label');
  const discountAmountEl = document.getElementById('discount-amount');
  const fareFormulaEl = document.getElementById('fare-formula');
  
  fareDisplay.textContent = `₱${fareData.fare}`;
  
  if (fareData.discountType === 'special') {
    fareBreakdown.style.display = 'flex';
    regularFareEl.textContent = `₱${fareData.baseFare}`;
    discountAmountEl.textContent = `-₱${fareData.discountAmount}`;
    discountLabelEl.textContent = 'Special Discount (20%)';
    fareFormulaEl.textContent = '₱15 base (4km) + ₱1/km, minus 20% discount';
  } else {
    fareBreakdown.style.display = 'none';
    fareFormulaEl.textContent = '₱15 base (4km) + ₱1/km';
  }
}

function clearTrikeRoute() {
  if (state.trike.routeControl) {
    state.trike.routeControl.remove();
    state.trike.routeControl = null;
  }
}

function clearTrikeMarkers() {
  if (state.trike.startMarker) {
    state.trike.startMarker.remove();
    state.trike.startMarker = null;
  }
  if (state.trike.endMarker) {
    state.trike.endMarker.remove();
    state.trike.endMarker = null;
  }
  clearTrikeRoute();
  
  document.getElementById('search-start').value = '';
  document.getElementById('search-end').value = '';
  const startLbl = document.getElementById('start-display');
  const endLbl = document.getElementById('end-display');
  const startInp = document.getElementById('search-start');
  const endInp   = document.getElementById('search-end');
  if (startLbl) { startLbl.textContent = 'Tap map or search'; startLbl.classList.add('is-placeholder'); startLbl.style.display = ''; }
  if (endLbl)   { endLbl.textContent   = 'Tap map or search'; endLbl.classList.add('is-placeholder');   endLbl.style.display   = ''; }
  if (startInp) startInp.classList.remove('is-active');
  if (endInp)   endInp.classList.remove('is-active');
  document.getElementById('distance-display').textContent = '—';
  document.getElementById('fare-display').textContent = '₱—';
  document.getElementById('fare-breakdown').style.display = 'none';
  
  const panel = document.getElementById('control-panel');
  panel.classList.remove('expanded');
}

function showRoute(routeKey) {
  clearBusJeepRoute();
  
  const route = ROUTES[routeKey];
  if (!route) return;

  state.busjeep.selectedRoute = routeKey;

  const isWhite = route.color === '#ffffff';

  route.stops.forEach((coords, idx) => {
    const glowColor = isWhite ? '#cbd5e1' : route.color;
    const marker = L.circleMarker(coords, {
      radius: 10,
      color: isWhite ? '#000000' : '#ffffff',
      fillColor: isWhite ? '#ffffff' : glowColor,
      fillOpacity: 1,
      weight: isWhite ? 2.5 : 3,
      className: 'bus-stop-marker',
      pane: 'busMarkerPane'
    }).addTo(state.map);

    // Apply inline glow via SVG filter on the marker element after it's added
    marker.on('add', () => {
      const el = marker.getElement();
      if (el) el.style.filter = `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor}80)`;
    });
    
    marker.bindTooltip(route.labels[idx], {
      permanent: false,
      direction: 'top'
    });
    
    state.busjeep.markers.push(marker);
  });

  const waypoints = route.stops.map(([lat, lng]) => L.latLng(lat, lng));

  // Build line styles — white route gets a dark border layer for visibility
  const lineStyles = isWhite
    ? [
        { color: '#000000', weight: 9,  opacity: 0.25 },
        { color: '#000000', weight: 7,  opacity: 0.35 },
        { color: '#ffffff', weight: 5,  opacity: 1    }
      ]
    : [
        { color: route.color, weight: 18, opacity: 0.18 },
        { color: route.color, weight: 11, opacity: 0.35 },
        { color: route.color, weight: 5,  opacity: 1    }
      ];
  
  // Use a custom SVG renderer that draws into busRoutePane (z-index 420),
  // so route lines always appear above the dark overlay (z-index 300).
  const busRenderer = L.svg({ pane: 'busRoutePane' });

  state.busjeep.routeControl = L.Routing.control({
    waypoints,
    lineOptions: {
      styles: lineStyles,
      addWaypoints: false,
      renderer: busRenderer
    },
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),
    createMarker: () => null,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: false
  }).addTo(state.map);

  // Zoom in on the route bounds
  const bounds = L.latLngBounds(waypoints);
  state.map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });

  showRouteDetail(route);
  showToast(`🚌 ${route.name} selected`);
}

function showRouteDetail(route) {
  const detailEl = document.getElementById('route-detail');
  const nameEl = document.getElementById('route-detail-name');
  const stopsEl = document.getElementById('stops-list');
  
  nameEl.textContent = route.name;
  
  stopsEl.innerHTML = route.labels.map((label, idx) => `
    <div class="stop-item clickable-stop" data-idx="${idx}" style="cursor:pointer;">
      <div class="stop-number">${idx + 1}</div>
      <div>${label}</div>
    </div>
  `).join('');

  // Make each stop clickable to zoom into that stop on the map
  stopsEl.querySelectorAll('.clickable-stop').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx);
      const coords = route.stops[idx];
      if (coords) {
        state.map.flyTo([coords[0], coords[1]], 17, { duration: 0.8 });
        // Show tooltip on the corresponding marker
        const marker = state.busjeep.markers[idx];
        if (marker) marker.openTooltip();
      }
    });
  });
  
  detailEl.style.display = 'block';
}

function clearBusJeepRoute() {
  if (state.busjeep.routeControl) {
    state.busjeep.routeControl.remove();
    state.busjeep.routeControl = null;
  }
  
  state.busjeep.markers.forEach(m => m.remove());
  state.busjeep.markers = [];
  state.busjeep.selectedRoute = null;
  
  document.getElementById('route-detail').style.display = 'none';
}

function switchMode(mode) {
  if (state.currentMode === mode) return;
  
  state.currentMode = mode;
  
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  
  document.querySelectorAll('.panel-view').forEach(view => {
    view.classList.toggle('active', view.dataset.view === mode);
  });
  
  if (mode !== 'trike') {
    clearTrikeMarkers();
  }
  if (mode !== 'busjeep') {
    clearBusJeepRoute();
    // Remove map overlay when leaving bus mode
    const overlay = document.getElementById('map-dark-overlay');
    if (overlay) overlay.style.display = 'none';
    // Remove bus user location marker
    if (state.busjeep.userMarker) {
      state.busjeep.userMarker.remove();
      state.busjeep.userMarker = null;
    }
  } else {
    // Place dark overlay directly inside #map so it's in the same stacking context as Leaflet panes.
    // z-index 300 = above tiles (200) but below Leaflet's overlayPane (400) and markerPane (600).
    let overlay = document.getElementById('map-dark-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'map-dark-overlay';
      overlay.style.cssText = [
        'position:absolute',
        'top:0', 'left:0', 'right:0', 'bottom:0',
        'width:100%', 'height:100%',
        'background:rgba(0,0,0,0.55)',
        'pointer-events:none',
        'z-index:300',
        'transition:opacity 0.3s'
      ].join(';');
      document.getElementById('map').appendChild(overlay);
    }
    overlay.style.display = 'block';

    // Auto-select Uhaw route
    setTimeout(() => {
      document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
      const uhawCard = document.querySelector('.route-card[data-route="uhaw"]');
      if (uhawCard) uhawCard.classList.add('selected');
      showRoute('uhaw');
    }, 100);
  }
  
  const panel = document.getElementById('control-panel');
  panel.classList.remove('expanded');
  
  setTimeout(() => state.map.invalidateSize(), 100);
}

function selectDiscount(discountType) {
  if (state.discountType === discountType) return;
  
  state.discountType = discountType;
  
  document.querySelectorAll('.discount-btn').forEach(btn => {
    const isActive = btn.dataset.discount === discountType;
    btn.classList.toggle('active', isActive);
  });
  
  if (state.trike.startMarker && state.trike.endMarker) {
    updateTrikeRoute();
  }
  
  const discountNames = {
    none: 'Regular fare',
    special: 'Special discount applied (20% off)'
  };
  showToast(discountNames[discountType] || 'Fare updated');
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  const lbl = document.getElementById('dark-mode-label');
  if (lbl) lbl.textContent = isDark ? 'Light' : 'Dark';
  showToast(isDark ? 'Dark mode on' : 'Light mode on');
}

function useBusLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported');
    return;
  }
  showToast('Getting location...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const latlng = L.latLng(latitude, longitude);

      // Remove previous user location marker if any
      if (state.busjeep.userMarker) {
        state.busjeep.userMarker.remove();
      }

      state.busjeep.userMarker = L.circleMarker(latlng, {
        radius: 10,
        color: '#ffffff',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 3
      }).addTo(state.map);
      state.busjeep.userMarker.bindTooltip('You are here', { permanent: false, direction: 'top' });

      state.map.setView(latlng, 15);
      showToast('Location found');
    },
    () => showToast('Could not get location'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function initMatrixTabs() {
  document.querySelectorAll('.matrix-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cluster = tab.dataset.cluster;
      
      document.querySelectorAll('.matrix-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.cluster === cluster);
      });
      
      document.querySelectorAll('.matrix-view').forEach(view => {
        view.classList.toggle('active', view.dataset.cluster === cluster);
      });
    });
  });
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('❌ Geolocation not supported');
    return;
  }

  showToast('📍 Getting location...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const latlng = L.latLng(latitude, longitude);

      if (state.trike.startMarker) {
        state.trike.startMarker.setLatLng(latlng);
      } else {
        state.trike.startMarker = L.marker(latlng, {
          draggable: true,
          icon: createMarkerIcon('A', '#10b981')
        }).addTo(state.map);
        state.trike.startMarker.on('dragend', updateTrikeRoute);
      }

      state.map.setView(latlng, 15);
      updateTrikeRoute();
      showToast('✅ Location set');
    },
    (error) => {
      console.error('Geolocation error:', error);
      showToast('❌ Could not get location');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function initEventListeners() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMode(btn.dataset.mode);
    });
  });

  document.querySelectorAll('.discount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectDiscount(btn.dataset.discount);
    });
  });

  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }

  document.getElementById('reset-trike').addEventListener('click', () => {
    clearTrikeMarkers();
    showToast('🔄 Reset');
  });

  document.getElementById('use-location').addEventListener('click', useCurrentLocation);

  const searchStart = document.getElementById('search-start');
  const searchEnd = document.getElementById('search-end');

  // Toggle input/label: click label -> show input; blur -> hide input, show label with address
  function setupSearchField(inputId, labelId) {
    const inp = document.getElementById(inputId);
    const lbl = document.getElementById(labelId);
    if (!inp || !lbl) return;
    // Clicking the label activates the input
    lbl.addEventListener('click', () => {
      lbl.style.display = 'none';
      inp.classList.add('is-active');
      inp.focus();
      inp.value = '';
    });
    // Also activate when clicking the wrapper area
    inp.closest && inp.closest('.input-wrapper') && inp.closest('.input-wrapper').addEventListener('click', () => {
      lbl.style.display = 'none';
      inp.classList.add('is-active');
      inp.focus();
    });
    // On blur: hide input, show label with whatever address is set
    inp.addEventListener('blur', () => {
      inp.classList.remove('is-active');
      lbl.style.display = '';
      inp.value = '';
    });
  }
  setupSearchField('search-start', 'start-display');
  setupSearchField('search-end', 'end-display');

  // ── Helper: place-selection callbacks ───────────────────────────────────────
  function selectStartPlace(place) {
    const latlng = L.latLng(place.lat, place.lng);
    addToSearchHistory(place);
    if (state.trike.startMarker) {
      state.trike.startMarker.setLatLng(latlng);
    } else {
      state.trike.startMarker = L.marker(latlng, {
        draggable: true,
        icon: createMarkerIcon('A', '#10b981')
      }).addTo(state.map);
      state.trike.startMarker.on('dragend', updateTrikeRoute);
    }
    state.map.setView(latlng, 15);
    updateTrikeRoute();
    searchStart.blur();
  }

  function selectEndPlace(place) {
    const latlng = L.latLng(place.lat, place.lng);
    addToSearchHistory(place);
    if (state.trike.endMarker) {
      state.trike.endMarker.setLatLng(latlng);
    } else {
      state.trike.endMarker = L.marker(latlng, {
        draggable: true,
        icon: createMarkerIcon('B', '#ef4444')
      }).addTo(state.map);
      state.trike.endMarker.on('dragend', updateTrikeRoute);
    }
    state.map.setView(latlng, 15);
    updateTrikeRoute();
    searchEnd.blur();
  }

  // ── Start field ──────────────────────────────────────────────────────────────
  searchStart.addEventListener('focus', () => {
    // Close end-field dropdown before opening start's
    removeAutocomplete(searchEnd);
    createAutocompleteDropdown(searchStart, selectStartPlace);
  });

  searchStart.addEventListener('input', () => {
    createAutocompleteDropdown(searchStart, selectStartPlace);
  });

  searchStart.addEventListener('keypress', async (e) => {
    if (e.key !== 'Enter') return;
    const query = e.target.value.trim();
    if (!query) return;
    closeAllAutocompletes();
    const latlng = await geocode(query);
    if (latlng) {
      if (state.trike.startMarker) {
        state.trike.startMarker.setLatLng(latlng);
      } else {
        state.trike.startMarker = L.marker(latlng, {
          draggable: true,
          icon: createMarkerIcon('A', '#10b981')
        }).addTo(state.map);
        state.trike.startMarker.on('dragend', updateTrikeRoute);
      }
      state.map.setView(latlng, 15);
      updateTrikeRoute();
      e.target.blur();
    }
  });

  // ── End field ────────────────────────────────────────────────────────────────
  searchEnd.addEventListener('focus', () => {
    // Close start-field dropdown before opening end's
    removeAutocomplete(searchStart);
    createAutocompleteDropdown(searchEnd, selectEndPlace);
  });

  searchEnd.addEventListener('input', () => {
    createAutocompleteDropdown(searchEnd, selectEndPlace);
  });

  searchEnd.addEventListener('keypress', async (e) => {
    if (e.key !== 'Enter') return;
    const query = e.target.value.trim();
    if (!query) return;
    closeAllAutocompletes();
    const latlng = await geocode(query);
    if (latlng) {
      if (state.trike.endMarker) {
        state.trike.endMarker.setLatLng(latlng);
      } else {
        state.trike.endMarker = L.marker(latlng, {
          draggable: true,
          icon: createMarkerIcon('B', '#ef4444')
        }).addTo(state.map);
        state.trike.endMarker.on('dragend', updateTrikeRoute);
      }
      state.map.setView(latlng, 15);
      updateTrikeRoute();
      e.target.blur();
    }
  });

  document.querySelectorAll('.route-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      showRoute(card.dataset.route);
    });
  });

  document.getElementById('clear-route').addEventListener('click', () => {
    clearBusJeepRoute();
    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
    showToast('Route cleared');
  });

  // Bus mode: My Location button
  const useBusLocBtn = document.getElementById('use-location-bus');
  if (useBusLocBtn) {
    useBusLocBtn.addEventListener('click', useBusLocation);
  }
}

function init() {
  initMap();
  // Mark initial labels as placeholders so they render in grey
  ['start-display','end-display'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-placeholder');
  });
  initEventListeners();
  initPanelDrag();
  initMatrixTabs();
  initComplaintModal();
  initAdminPanel();
  
  const darkMode = localStorage.getItem('darkMode');
  if (darkMode === 'enabled') {
    document.body.classList.add('dark-mode');
    const lbl = document.getElementById('dark-mode-label');
    if (lbl) lbl.textContent = 'Light';
  }
  
  setTimeout(() => {
    showToast('👋 Welcome to GenSan Fare!', 3000);
  }, 500);
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('resize', () => {
  if (state.map) {
    state.map.invalidateSize();
  }
});
