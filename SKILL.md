---
name: geoguard-monitoring
description: GeoGuard geospatial satellite monitoring, vertical map snapshot capture, incident alarm tracking, and Gemini change detection engine.
---

# GeoGuard Program Skill & Technical Reference

## Overview
This skill documents the technical execution patterns, data structures, and operation workflows for the **GeoGuard** satellite and drone geospatial monitoring system.

## 1. Vertical Map Snapshot Engine (`/src/utils/mapImageCanvas.ts`)
- **Aspect Ratio & Dimensions**: All map images and snapshot tiles are captured and rendered in **vertical orientation (480px width × 720px height)**.
- **Capture Fallback Order**:
  1. Server Google Static Maps Proxy (`/api/map-snapshot`)
  2. Client-side Google Static Maps API
  3. Canvas DOM rendering
  4. Tile-based OpenStreetMap / Satellite tile compositor
  5. High-definition synthetic canvas generator (`generateSyntheticMapSnapshot`)
- **HUD & Overlay Standard**:
  - Vertical layout HUD banner positioned at top left (location & coordinates).
  - Date badge at top right.
  - Event warning banner centered near bottom (`height - 46`).
  - Target crosshair positioned at exact center (`width / 2`, `height / 2`).
  - Output format: JPEG with 82% quality compression (`toDataURL('image/jpeg', 0.82)`) for optimal storage footprint.

## 2. Storage & Persistence (`/src/utils/snapshotStore.ts` & `/src/utils/firestoreService.ts`)
- **LocalStorage Quota Safe-Guard**: `safeSaveToLocalStorage` wraps `localStorage.setItem` calls and gracefully prunes older snapshot entries (retaining top 12 items) if browser storage limits are reached.
- **Firestore Object Sanitization**: `sanitizeForFirestore` recursively removes all `undefined` values from payloads before invoking `setDoc` or `writeBatch` to prevent Firestore document validation errors.

## 3. Gemini AI Analysis Pipeline (`server.ts`)
- **Endpoints**:
  - `POST /api/gemini/analyze-change`: Compares two temporal snapshots to identify geospatial changes, confidence scores, and affected quad-zones.
  - `POST /api/gemini/search-place-info`: Performs Google Search-grounded geospatial site inspection.
- **Quota Resilience**: Includes exponential backoff and automatic structured fallback generation when API rate limits or free-tier quotas are reached.

## 4. UI Components Architecture
- `GoogleMapView.tsx`: Interactive satellite map canvas with zoom, pan, map style switcher, and instant vertical snapshot trigger.
- `SnapshotManager.tsx`: Timeline viewer, vertical dual-snapshot comparison slider (A/B wipe), and change inspection report modal.
- `AccidentScannerModal.tsx`: Real-time incident scanner monitoring drone alerts, traffic incidents, and environmental changes.
- `AlarmsView.tsx`: Active threshold alarm configuration and automated notification manager.
