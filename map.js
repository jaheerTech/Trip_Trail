/* Travel Map Planner: Leaflet + Nominatim + OSRM
   - Search: Nominatim geocoding for origin, waypoints, destination
   - Routing: OSRM demo server for driving/cycling/walking
   - Optimize: fastest/shortest via profile & weight hints
   - Distance/time/cost estimation with simple heuristics
*/

(function() {
  const map = L.map('map').setView([22.9734, 78.6569], 5); // India view

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const originInput = document.getElementById('origin');
  const waypointsInput = document.getElementById('waypoints');
  const destinationInput = document.getElementById('destination');
  const modeSelect = document.getElementById('mode');
  const optimizeSelect = document.getElementById('optimize');
  const planBtn = document.getElementById('plan');
  const clearBtn = document.getElementById('clear');
  const statsEl = document.getElementById('stats');

  let markers = [];
  let routeLayer = null;

  function clearMap() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }
    statsEl.textContent = '';
  }

  async function geocodeOne(query) {
    if (!query) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    return { lat: parseFloat(first.lat), lon: parseFloat(first.lon), label: first.display_name };
  }

  function addMarker(point, label) {
    const marker = L.marker([point.lat, point.lon]).addTo(map).bindPopup(label || '');
    markers.push(marker);
    return marker;
  }

  function fitToMarkers() {
    if (markers.length === 0) return;
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }

  function formatKm(meters) {
    return (meters / 1000).toFixed(1);
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m} min`;
    return `${h} h ${m} min`;
  }

  function estimateCost(meters, seconds, mode) {
    // Simple heuristics in INR: fuel or effort proxy
    const km = meters / 1000;
    switch (mode) {
      case 'driving': {
        // 15 km/l, petrol 105 INR/l → ~7 INR/km + toll buffer
        const fuel = km * 7;
        const toll = km > 150 ? 200 : 50;
        return Math.round(fuel + toll);
      }
      case 'cycling':
        // Rental or maintenance proxy
        return Math.round(km * 1.5);
      case 'walking':
        return 0;
      default:
        return Math.round(km * 5);
    }
  }

  async function planRoute() {
    clearMap();
    const originQ = originInput.value.trim();
    const destinationQ = destinationInput.value.trim();
    const waypointsQ = waypointsInput.value.trim();
    const mode = modeSelect.value;
    const optimize = optimizeSelect.value;

    if (!originQ || !destinationQ) {
      statsEl.textContent = 'Please provide both origin and destination';
      return;
    }

    try {
      const wpQueries = waypointsQ ? waypointsQ.split(',').map(s => s.trim()).filter(Boolean) : [];

      // Geocode in parallel
      const geocodes = await Promise.all([
        geocodeOne(originQ),
        ...wpQueries.map(geocodeOne),
        geocodeOne(destinationQ)
      ]);

      const points = geocodes.filter(Boolean);
      if (points.length < 2) {
        statsEl.textContent = 'Could not geocode locations. Try more specific names.';
        return;
      }

      // Add markers
      const labels = [originQ, ...wpQueries, destinationQ];
      points.forEach((p, i) => addMarker(p, labels[i] || ''));
      fitToMarkers();

      // Prepare coordinates for OSRM
      // If optimize shortest: we do not have full TSP; we'll use OSRM with continue_straight and geometries polyline
      const coords = points.map(p => `${p.lon},${p.lat}`).join(';');
      const base = `https://router.project-osrm.org/route/v1/${mode}/${coords}`;
      const params = new URLSearchParams({
        overview: 'full', geometries: 'geojson', steps: 'false', annotations: 'false'
      });
      if (optimize === 'shortest') {
        params.set('alternatives', 'true');
      }
      const url = `${base}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Routing failed');
      const data = await res.json();
      if (!data.routes || data.routes.length === 0) throw new Error('No route found');

      // Choose best route by duration or distance
      let chosen = data.routes[0];
      if (optimize === 'shortest') {
        chosen = data.routes.reduce((min, r) => (r.distance < min.distance ? r : min), data.routes[0]);
      } else {
        chosen = data.routes.reduce((min, r) => (r.duration < min.duration ? r : min), data.routes[0]);
      }

      routeLayer = L.geoJSON(chosen.geometry, { style: { color: '#1e88e5', weight: 5 } }).addTo(map);
      map.fitBounds(routeLayer.getBounds().pad(0.2));

      const km = formatKm(chosen.distance);
      const time = formatDuration(chosen.duration);
      const cost = estimateCost(chosen.distance, chosen.duration, mode);

      statsEl.innerHTML = '';
      const parts = [
        `<span class="pill">Distance: ${km} km</span>`,
        `<span class="pill">Time: ${time}</span>`,
        `<span class="pill">Mode: ${mode}</span>`,
        `<span class="pill">Est. Cost: ₹${cost}</span>`
      ];
      statsEl.innerHTML = parts.join(' ');
    } catch (e) {
      console.error(e);
      statsEl.textContent = 'Planning failed. Please adjust inputs and try again.';
    }
  }

  planBtn.addEventListener('click', planRoute);
  clearBtn.addEventListener('click', clearMap);
  destinationInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') planRoute(); });
})();


