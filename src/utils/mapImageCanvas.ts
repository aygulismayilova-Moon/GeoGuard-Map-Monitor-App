/**
 * Map Image & Snapshot Utility
 * Generates high-fidelity satellite/roadmap canvas representations, fetches Google Static Map imagery,
 * and handles map viewport canvas capture with metadata overlays.
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

export interface CaptureSnapshotParams extends SimulationOverlayOptions {
  mapContainer?: HTMLDivElement | null;
  apiKey?: string;
}

/**
 * Returns a Google Maps Static API URL if a valid API key is present
 */
export function getGoogleStaticMapUrl(
  lat: number,
  lng: number,
  zoom: number,
  mapType: string = 'satellite',
  apiKey: string = '',
  width = 480,
  height = 720
): string {
  if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') return '';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=${mapType}&markers=color:blue%7Clabel:P%7C${lat},${lng}&key=${apiKey}`;
}

/**
 * Fetches Google Static Map image via backend API route if available
 */
async function fetchServerGoogleStaticMap(
  lat: number,
  lng: number,
  zoom: number,
  mapType: string,
  width = 480,
  height = 720
): Promise<string | null> {
  try {
    const res = await fetch(`/api/map-snapshot?lat=${lat}&lng=${lng}&zoom=${zoom}&maptype=${mapType}&width=${width}&height=${height}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.imageDataUrl) {
        return data.imageDataUrl;
      }
    }
  } catch (err) {
    console.warn('Backend map snapshot proxy error:', err);
  }
  return null;
}

/**
 * Renders real high-resolution satellite or roadmap map tiles for exact coordinates on a canvas
 */
export async function fetchRealTileMapCanvas(
  lat: number,
  lng: number,
  zoom: number,
  mapType: string = 'satellite',
  width = 480,
  height = 720
): Promise<HTMLCanvasElement | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const z = Math.min(Math.max(zoom, 1), 19);
    const n = Math.pow(2, z);
    const xFrac = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const yFrac = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

    const centerTileX = Math.floor(xFrac);
    const centerTileY = Math.floor(yFrac);

    const tileSize = 256;
    const offsetX = Math.round((xFrac - centerTileX) * tileSize);
    const offsetY = Math.round((yFrac - centerTileY) * tileSize);

    const centerX = width / 2;
    const centerY = height / 2;

    const isSatellite = mapType === 'satellite' || mapType === 'hybrid' || !mapType;

    const tilePromises: Promise<void>[] = [];

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const tx = (centerTileX + dx + n) % n;
        const ty = centerTileY + dy;
        if (ty < 0 || ty >= n) continue;

        let tileUrl = '';
        if (isSatellite) {
          tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`;
        } else {
          tileUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
        }

        const promise = new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const posX = centerX + dx * tileSize - offsetX;
            const posY = centerY + dy * tileSize - offsetY;
            ctx.drawImage(img, posX, posY, tileSize, tileSize);
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = tileUrl;
        });

        tilePromises.push(promise);
      }
    }

    await Promise.all(tilePromises);
    return canvas;
  } catch (err) {
    console.warn('Real tile canvas render notice:', err);
    return null;
  }
}

/**
 * Asynchronously captures a real Google Map snapshot in vertical orientation
 */
export async function captureGoogleMapSnapshot(params: CaptureSnapshotParams): Promise<string> {
  const { mapContainer, apiKey, placeName, lat, lng, zoom, mapType = 'satellite', eventType = 'Baseline', dateText } = params;

  // 1. Try server proxy for official Google Static Maps API (Vertical 480x720)
  const serverGoogleImage = await fetchServerGoogleStaticMap(lat, lng, zoom, mapType, 480, 720);
  if (serverGoogleImage) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load server google image'));
        img.src = serverGoogleImage;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width || 480;
      canvas.height = img.height || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        drawMapHUDAndOverlays(ctx, canvas.width, canvas.height, { placeName, lat, lng, zoom, eventType, dateText });
        return canvas.toDataURL('image/jpeg', 0.82);
      }
    } catch (err) {
      console.warn('Server static map overlay error:', err);
    }
  }

  // 2. Try client API Key for official Google Static Maps API (Vertical 480x720)
  const staticMapUrl = getGoogleStaticMapUrl(lat, lng, zoom, mapType, apiKey || '', 480, 720);
  if (staticMapUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load Google Static Map image'));
        img.src = staticMapUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width || 480;
      canvas.height = img.height || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        drawMapHUDAndOverlays(ctx, canvas.width, canvas.height, { placeName, lat, lng, zoom, eventType, dateText });
        return canvas.toDataURL('image/jpeg', 0.82);
      }
    } catch (err) {
      console.warn('Google Static Map fetch notice:', err);
    }
  }

  // 3. Try DOM canvas capture from interactive Google Map container
  if (mapContainer) {
    const mapCanvases = Array.from(mapContainer.querySelectorAll('canvas'));
    if (mapCanvases.length > 0) {
      try {
        const primaryCanvas = mapCanvases[0];
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          mapCanvases.forEach((c) => {
            try { ctx.drawImage(c, 0, 0, canvas.width, canvas.height); } catch (_) {}
          });
          drawMapHUDAndOverlays(ctx, canvas.width, canvas.height, { placeName, lat, lng, zoom, eventType, dateText });
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          if (dataUrl && dataUrl.length > 500) {
            return dataUrl;
          }
        }
      } catch (err) {
        console.warn('Direct canvas draw notice:', err);
      }
    }
  }

  // 4. Load real satellite / map tiles for exact coordinates (Vertical 480x720)
  const tileCanvas = await fetchRealTileMapCanvas(lat, lng, zoom, mapType, 480, 720);
  if (tileCanvas) {
    const ctx = tileCanvas.getContext('2d');
    if (ctx) {
      drawMapHUDAndOverlays(ctx, tileCanvas.width, tileCanvas.height, { placeName, lat, lng, zoom, eventType, dateText });
      return tileCanvas.toDataURL('image/jpeg', 0.82);
    }
  }

  // 5. Fallback synthetic canvas generator (Vertical 480x720)
  return generateSyntheticMapSnapshot({ placeName, eventType, dateText, lat, lng, zoom, mapType });
}

/**
 * Draws HUD metadata (title, coords, zoom, date badge, target crosshair) and event indicators on a canvas context
 */
function drawMapHUDAndOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: {
    placeName: string;
    lat: number;
    lng: number;
    zoom: number;
    eventType: string;
    dateText: string;
  }
) {
  const { placeName, lat, lng, zoom, eventType, dateText } = opts;

  // Event overlay additions if simulated
  let eventText = '';
  let eventBg = 'rgba(239, 68, 68, 0.9)';
  if (eventType === 'Construction') {
    eventText = '⚠️ NEW CONSTRUCTION SITE';
    eventBg = 'rgba(239, 68, 68, 0.9)';
  } else if (eventType === 'Accident') {
    eventText = '🚨 VEHICLE ACCIDENT SCENE';
    eventBg = 'rgba(220, 38, 38, 0.9)';
  } else if (eventType === 'Deforestation') {
    eventText = '🪓 TREE CUTTING / CLEARING';
    eventBg = 'rgba(217, 119, 6, 0.9)';
  } else if (eventType === 'Flood') {
    eventText = '🌊 FLOOD / WATER INUNDATION';
    eventBg = 'rgba(14, 116, 144, 0.9)';
  }

  if (eventText) {
    const bannerW = 250;
    const bannerX = Math.max(10, (width - bannerW) / 2);
    ctx.fillStyle = eventBg;
    ctx.fillRect(bannerX, height - 46, bannerW, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(bannerX, height - 46, bannerW, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(eventText, width / 2, height - 26);
    ctx.textAlign = 'left';
  }

  // Map HUD / Location Bar (Top Left)
  const topBoxW = Math.min(270, width - 180);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(10, 10, topBoxW, 56);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(10, 10, topBoxW, 56);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px sans-serif';
  const displayTitle = placeName.length > 26 ? placeName.substring(0, 24) + '...' : placeName;
  ctx.fillText(displayTitle, 18, 28);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px monospace';
  ctx.fillText(`LAT:${lat.toFixed(4)} LNG:${lng.toFixed(4)} | Z:${zoom}x`, 18, 46);

  // Timestamp badge (Top Right)
  const badgeW = 160;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(width - badgeW - 10, 10, badgeW, 32);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(width - badgeW - 10, 10, badgeW, 32);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(`📅 ${dateText}`, width - badgeW + 2, 30);

  // Target Crosshair at Center
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 15, height / 2);
  ctx.lineTo(width / 2 + 15, height / 2);
  ctx.moveTo(width / 2, height / 2 - 15);
  ctx.lineTo(width / 2, height / 2 + 15);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 8, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Generates a realistic synthetic satellite/map image data URL for a place and event.
 * Useful for pre-loading initial temporal snapshots (e.g. Yesterday vs Today) or offline map simulation.
 */
export function generateSyntheticMapSnapshot(options: SimulationOverlayOptions): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 720;
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

  return canvas.toDataURL('image/jpeg', 0.82);
}
