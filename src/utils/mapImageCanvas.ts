/**
 * Map Image & Snapshot Utility
 * Generates high-fidelity satellite/roadmap canvas representations and handles map viewport canvas capture.
 */

export interface SimulationOverlayOptions {
  placeName: string;
  eventType?: 'Baseline' | 'Construction' | 'Accident' | 'Deforestation' | 'Flood' | 'Normal';
  dateText: string;
  lat: number;
  lng: number;
  zoom: number;
  mapType?: 'satellite' | 'roadmap' | 'hybrid' | 'terrain';
}

/**
 * Generates a realistic synthetic satellite/map image data URL for a place and event.
 * Useful for pre-loading initial temporal snapshots (e.g. Yesterday vs Today) or offline map simulation.
 */
export function generateSyntheticMapSnapshot(options: SimulationOverlayOptions): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const isSatellite = options.mapType === 'satellite' || options.mapType === 'hybrid' || !options.mapType;

  // Background - Satellite terrain vs Roadmap
  if (isSatellite) {
    // Rich earth tones, roads, vegetation, water
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#1c2819'); // Dense vegetation dark green
    bgGradient.addColorStop(0.4, '#2d3b27');
    bgGradient.addColorStop(0.7, '#383329'); // Soil / gravel
    bgGradient.addColorStop(1, '#1b232a'); // Urban asphalt
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (latitude / longitude grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw main roads / arteries
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.bezierCurveTo(200, 160, 400, 220, 640, 200);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b'; // Primary highway yellow line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.bezierCurveTo(200, 160, 400, 220, 640, 200);
    ctx.stroke();

    // Cross street
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(320, 400);
    ctx.stroke();

    // Water body or coastal strip
    if (options.placeName.toLowerCase().includes('harbor') || options.placeName.toLowerCase().includes('marina') || options.placeName.toLowerCase().includes('coastal')) {
      ctx.fillStyle = '#0f4c81';
      ctx.beginPath();
      ctx.moveTo(420, 0);
      ctx.lineTo(640, 0);
      ctx.lineTo(640, 400);
      ctx.lineTo(520, 400);
      ctx.quadraticCurveTo(450, 200, 420, 0);
      ctx.fill();
    }

    // Base Buildings / Structures
    ctx.fillStyle = '#475569';
    ctx.fillRect(80, 80, 70, 60);
    ctx.fillRect(170, 70, 90, 50);
    ctx.fillRect(80, 240, 110, 80);

    // Trees & Vegetation patches
    ctx.fillStyle = '#15803d';
    for (let i = 0; i < 25; i++) {
      const tx = 40 + (i * 17) % 240;
      const ty = 250 + (i * 11) % 120;
      ctx.beginPath();
      ctx.arc(tx, ty, 10 + (i % 6), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Clean Roadmap Style
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(640, 200);
    ctx.stroke();
  }

  // --- Dynamic Temporal Event Overlays ---
  const event = options.eventType || 'Baseline';

  if (event === 'Construction') {
    // Construction site additions: Cranes, scaffolding, excavation dirt pit, safety barriers
    // Dirt excavation zone
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(340, 220, 140, 100);

    // Steel structure / yellow foundation frame
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(350, 230, 120, 80);

    // Tower Crane representation
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(410, 270);
    ctx.lineTo(410, 150); // Crane vertical mast
    ctx.lineTo(480, 150); // Jib arm
    ctx.stroke();

    // Crane hook wire
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(460, 150);
    ctx.lineTo(460, 220);
    ctx.stroke();

    // Warning Badge overlay
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.fillRect(340, 195, 150, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('⚠️ NEW CONSTRUCTION SITE', 345, 210);
  } else if (event === 'Accident') {
    // Car Collision / Traffic incident on the main road
    const cx = 320;
    const cy = 180;

    // Emergency vehicle flashing glow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();

    // Damaged vehicles
    ctx.fillStyle = '#dc2626'; // Vehicle A
    ctx.save();
    ctx.translate(cx - 10, cy - 5);
    ctx.rotate(0.4);
    ctx.fillRect(-15, -8, 30, 16);
    ctx.restore();

    ctx.fillStyle = '#2563eb'; // Vehicle B
    ctx.save();
    ctx.translate(cx + 10, cy + 5);
    ctx.rotate(-0.3);
    ctx.fillRect(-15, -8, 30, 16);
    ctx.restore();

    // Skid marks & cones
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 10);
    ctx.lineTo(cx - 15, cy - 5);
    ctx.stroke();

    // Warning Badge overlay
    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
    ctx.fillRect(240, 130, 160, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🚨 VEHICLE ACCIDENT SCENE', 248, 146);
  } else if (event === 'Deforestation') {
    // Tree cutting / forest loss
    // Stumps & cleared soil
    ctx.fillStyle = '#78350f'; // Brown cleared land replacing green
    ctx.beginPath();
    ctx.arc(120, 280, 55, 0, Math.PI * 2);
    ctx.fill();

    // Stumps
    ctx.fillStyle = '#fef3c7';
    for (let i = 0; i < 8; i++) {
      const sx = 90 + (i * 15) % 60;
      const sy = 255 + (i * 12) % 50;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Timber logs stacked
    ctx.fillStyle = '#b45309';
    ctx.fillRect(140, 260, 35, 12);
    ctx.fillRect(140, 275, 35, 12);

    // Warning Badge
    ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
    ctx.fillRect(60, 210, 150, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🪓 TREE CUTTING / CLEARING', 65, 225);
  } else if (event === 'Flood') {
    // Water inundation / flood
    ctx.fillStyle = 'rgba(14, 116, 144, 0.75)';
    ctx.beginPath();
    ctx.ellipse(320, 260, 180, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(230, 205, 180, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🌊 FLOOD / WATER INUNDATION', 235, 220);
  }

  // --- Map HUD / Timestamp / Coordinates Bar ---
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(10, 10, 360, 58);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(10, 10, 360, 58);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(options.placeName, 20, 30);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px monospace';
  ctx.fillText(`LAT: ${options.lat.toFixed(4)}  LNG: ${options.lng.toFixed(4)} | ZOOM: ${options.zoom}x`, 20, 46);

  // Timestamp badge (Top Right)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(canvas.width - 210, 10, 200, 32);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(canvas.width - 210, 10, 200, 32);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`📅 ${options.dateText}`, canvas.width - 200, 30);

  // Target Crosshair at Center
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 15, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 + 15, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 - 15);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 + 15);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
