# GeoGuard Map Monitor & Change Detector 

# Program link:
https://geoguard-map-monitor-change-detector-4470.ai.studio

# Overview 

The goal of this program is to streamline the operations of various agencies responsible for monitoring specific areas. Users input a list of areas under their supervision and track changes—such as new building construction, vehicle accidents, natural disasters, or tree felling—using Google Maps imagery. They capture an initial image of the area and subsequently compare it with daily Google Maps images to detect discrepancies. The program analyzes these images to identify any changes and reports the results. I utilized Gemma 4 to implement the notification system: the user selects an event type and a specific city or area, and the system checks whether the event has occurred, providing feedback via a notification.
The program also features an automated notification system to alert users. For instance, users can set up automatic alerts for specific areas and event types; if such an event occurs in the designated area, a notification is automatically sent to the user.

A Google Maps API key was used.

# Who can be the users of the program?
* State agencies controlling the territories (Instant detection of unauthorized building construction, tree felling in parks, car accidents, and traffic congestion issues.)
* Volunteers supporting nature (regarding tree felling and the detection of natural disasters)
* For drivers to stay informed about roads with heavy traffic and find alternative ways
* Tourists exploring places to visit (Via the program, tourists can view real images of their intended destination and decide whether or not it interests them.)


Skills folder:

```text
skills/
└── geoguard-monitoring/
    ├── SKILL.md
    └── references/
        ├── snapshot-engine.md
        ├── storage-persistence.md
        ├── gemini-pipeline.md
        └── ui-components.md

```

1. `skills/geoguard-monitoring/SKILL.md`

```
---
name: geoguard-monitoring
description: GeoGuard geospatial satellite monitoring, vertical map snapshot capture, incident alarm tracking, and Gemini change detection engine.
---

# GeoGuard Program Skill & Technical Reference

## Overview
The goal of this program is to streamline the operations of various agencies (state agencies, environmental volunteers, drivers, and tourists) responsible for monitoring specific areas. Users input monitored zones to track changes—such as new building construction, vehicle accidents, natural disasters, or tree felling—using Google Maps imagery and automated AI change detection.

## Modular References
* [Snapshot Engine](./references/snapshot-engine.md) - Vertical map snapshot capture, fallback order, and HUD overlay standards.
* [Storage & Persistence](./references/storage-persistence.md) - LocalStorage quota safe-guards and Firestore object sanitization.
* [Gemini AI Pipeline](./references/gemini-pipeline.md) - Analysis endpoints, change detection, and quota resilience.
* [UI Components Architecture](./references/ui-components.md) - Overview of core views, modals, and interactive map widgets.

```

2. `skills/geoguard-monitoring/references/snapshot-engine.md`

```
# Vertical Map Snapshot Engine (`/src/utils/mapImageCanvas.ts`)

* **Aspect Ratio & Dimensions**: All map images and snapshot tiles are captured and rendered in vertical orientation (**480px width × 720px height**).
* **Capture Fallback Order**:
  1. Server Google Static Maps Proxy (`/api/map-snapshot`)
  2. Client-side Google Static Maps API
  3. Canvas DOM rendering
  4. Tile-based OpenStreetMap / Satellite tile compositor
  5. High-definition synthetic canvas generator (`generateSyntheticMapSnapshot`)

## HUD & Overlay Standards
* **Vertical layout HUD banner**: Positioned at the top left (location & coordinates).
* **Date badge**: Positioned at the top right.
* **Event warning banner**: Centered near the bottom (`height - 46`).
* **Target crosshair**: Positioned at the exact center (`width / 2`, `height / 2`).
* **Output format**: JPEG with **82% quality compression** (`toDataURL('image/jpeg', 0.82)`) for optimal storage footprint.

```

3. `skills/geoguard-monitoring/references/storage-persistence.md`

```
# Storage & Persistence (`/src/utils/snapshotStore.ts` & `/src/utils/firestoreService.ts`)

* **LocalStorage Quota Safe-Guard**: `safeSaveToLocalStorage` wraps `localStorage.setItem` calls and gracefully prunes older snapshot entries (retaining the top 12 items) if browser storage limits are reached.
* **Firestore Object Sanitization**: `sanitizeForFirestore` recursively removes all `undefined` values from payloads before invoking `setDoc` or `writeBatch` to prevent Firestore document validation errors.

```

4. `skills/geoguard-monitoring/references/gemini-pipeline.md`

```
# Gemini AI Analysis Pipeline (`server.ts`)

## Endpoints
* **`POST /api/gemini/analyze-change`**: Compares two temporal snapshots to identify geospatial changes, confidence scores, and affected quad-zones.
* **`POST /api/gemini/search-place-info`**: Performs Google Search-grounded geospatial site inspection.

## Quota Resilience
Includes exponential backoff and automatic structured fallback generation when API rate limits or free-tier quotas are reached.

```

5. `skills/geoguard-monitoring/references/ui-components.md`

```
# UI Components Architecture

* **`GoogleMapView.tsx`**: Interactive satellite map canvas with keyboard navigation shortcuts (`↑↓←→` / `WASD` pan, `+/-` zoom, `R` recenter), automated snapshot capture engine (10s to 1 hour intervals with live countdown, event overlay simulation & auto-sync to Firestore), roadmap/satellite style toggles, closable place description overlay card, visual change detection guidance badges, and instant vertical snapshot trigger.
* **`SnapshotManager.tsx`**: Timeline viewer, side-by-side dual panel comparison view, vertical comparison slider (A/B wipe), Gemini change inspection report panel with extract options (Copy Text, Download .TXT, Download .JSON, Print PDF), and full Official Report Modal view.
* **`AddPlaceModal.tsx`**: Modal for adding new locations with strict duplicate control checking place name (case-insensitive trim) and latitude/longitude coordinates against existing datasets. Includes category presets (Construction, Environmental, Infrastructure, etc.).
* **`PlaceGrid.tsx`**: High-density location table with filterable category badges, row selection checkboxes with select-all header toggle, "Delete Selected" bulk removal button, user deletion confirmation safeguards, quick-filter category chips, search filtering, and sorting capabilities.
* **`CsvUploadModal.tsx`**: CSV dataset bulk uploader with PapaParse parsing, header normalization for flexible layouts, automated duplicate filtering, automatic field adjustments, and direct deployment into the main Places Grid dataset with real-time LocalStorage and Firestore sync.
* **`AccidentScannerModal.tsx`**: Real-time incident scanner monitoring drone alerts, traffic incidents, and environmental changes. Includes Gemma 4 incident detection with auto-attached vertical map snapshots (`480x720`), manual snapshot controls, and a full-screen Lightbox snapshot inspection modal.
* **`AlarmsView.tsx`**: Active threshold alarm configuration and automated notification manager.

```
