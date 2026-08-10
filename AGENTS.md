# AGENTS.md - GeoGuard Project Instructions & Conventions

## Overview
GeoGuard is a full-stack geospatial monitoring and incident tracking platform built with React 18, TypeScript, Vite, Express, and Firebase Firestore.

## Core Architecture & Capabilities
- **Full-Stack Execution**: Express server (`server.ts`) running on port 3000 (`0.0.0.0`) providing API proxies for map snapshot rendering and Gemini AI analysis.
- **Vertical Snapshot Engine**: All map and satellite snapshots are captured in vertical portrait orientation (480x720 resolution) to match mobile and field monitoring display ratios.
- **Firestore Synchronization**: Real-time sync for places, snapshots, accident events, and incident alarms, guarded by strict data sanitization (`sanitizeForFirestore`) to eliminate `undefined` fields.
- **Resilient AI Pipeline**: Express Gemini integration (`generateWithFallbackAndRetry`) with automatic free-tier quota recovery and structured fallback payload generation for change analysis and location inspection.
- **LocalStorage Quota Protection**: `safeSaveToLocalStorage` automatically prunes cached snapshot collections to prevent browser storage quota exceptions.

## Key Rules & Guidelines
1. **API Keys & Secrets**: Always access secret keys (`GEMINI_API_KEY`) on the server side (`server.ts`) — never expose secrets to the browser.
2. **Map Snapshots**: Maintain 480x720 vertical orientation across `getGoogleStaticMapUrl`, `fetchServerGoogleStaticMap`, `fetchRealTileMapCanvas`, and synthetic map generators.
3. **Data Sanitization**: Always pass objects through `sanitizeForFirestore()` before writing to Firestore collections.
4. **Build & Dev Execution**: Use `npm run dev` (`tsx server.ts`) for local development and `npm run build` (`vite build && esbuild server.ts ...`) for production bundling.
