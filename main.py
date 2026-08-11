#!/usr/bin/env python3
"""
GeoGuard Python Geospatial Utility & CLI Tool (`main.py`)

Provides geospatial coordinate math, Web Mercator tile mapping for 480x720 vertical snapshots,
haversine distance calculations, and offline/online change detection estimation for GeoGuard.
"""

import math
import json
import sys
import urllib.request
import urllib.error
import argparse

# Default Monitored Places matching GeoGuard Database
DEFAULT_PLACES = [
    {"id": "place-1", "name": "Amazon Rainforest Sector 4", "lat": -3.4653, "lng": -62.2159, "category": "Deforestation"},
    {"id": "place-2", "name": "Port of Rotterdam Logistics Hub", "lat": 51.9526, "lng": 4.1352, "category": "Industrial"},
    {"id": "place-3", "name": "Kyiv Perimeter Security Line", "lat": 50.4501, "lng": 30.5234, "category": "Conflict Zone"},
    {"id": "place-4", "name": "Tokyo Bay Coastal Infrastructure", "lat": 35.6191, "lng": 139.7786, "category": "Flood / Tsunami"},
    {"id": "place-5", "name": "Suez Canal Maritime Corridor", "lat": 30.5852, "lng": 32.2654, "category": "Shipping Bottleneck"},
    {"id": "place-6", "name": "Atacama Lithium Reserve", "lat": -23.5000, "lng": -68.3000, "category": "Mining / Environment"},
]

VERTICAL_WIDTH = 480
VERTICAL_HEIGHT = 720

def lat_lng_to_tile(lat: float, lng: float, zoom: int):
    """Converts WGS84 Latitude and Longitude to Web Mercator Tile X, Y coordinates."""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lng + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates the Great Circle distance (in kilometers) between two geographic points."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def simulate_change_analysis(place_name: str, lat: float, lng: float):
    """Simulates a geospatial change detection inspection report for a target place."""
    xtile, ytile = lat_lng_to_tile(lat, lng, 16)
    report = {
        "place": place_name,
        "coordinates": {"lat": lat, "lng": lng},
        "verticalResolution": f"{VERTICAL_WIDTH}x{VERTICAL_HEIGHT}",
        "webMercatorTile": {"x": xtile, "y": ytile, "zoom": 16},
        "analysis": {
            "changeDetected": True,
            "changeType": "Geospatial Surface Variance",
            "confidenceScore": 88.5,
            "severity": "Medium",
            "changedSectors": ["Central Quad-Zone", "East Boundary Edge"],
            "summary": f"Spatial analysis for {place_name} reveals structural surface changes in tile ({xtile}, {ytile}).",
            "recommendedActions": [
                "Verify ground perimeter boundary.",
                "Trigger automated drone flyover snapshot."
            ]
        }
    }
    return report

def check_server_health(host: str = "http://localhost:3000"):
    """Checks connection health of the local GeoGuard Express backend server."""
    endpoint = f"{host}/api/health"
    try:
        req = urllib.request.Request(endpoint, headers={'User-Agent': 'GeoGuard-Python-Client'})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ GeoGuard Express Server Status: {data}")
            return True
    except Exception as e:
        print(f"⚠️ GeoGuard Server check failed on {endpoint}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="GeoGuard Geospatial Satellite Utility (main.py)")
    parser.add_argument("--list", action="store_true", help="List default monitored locations")
    parser.add_argument("--analyze", type=str, metavar="PLACE_NAME", help="Run geospatial change analysis for a location")
    parser.add_argument("--output", "-o", type=str, metavar="FILE_PATH", help="Extract/Save analysis report to specified output file")
    parser.add_argument("--format", choices=["json", "text"], default="json", help="Report format for extraction (json or text)")
    parser.add_argument("--tile", nargs=3, metavar=('LAT', 'LNG', 'ZOOM'), help="Convert Lat Lng Zoom to Web Mercator Tile X,Y")
    parser.add_argument("--distance", nargs=4, metavar=('LAT1', 'LNG1', 'LAT2', 'LNG2'), help="Calculate distance in km between two coordinates")
    parser.add_argument("--check-server", action="store_true", help="Check local GeoGuard Express server health")

    args = parser.parse_args()

    if len(sys.argv) == 1:
        print("🌍 GeoGuard Geospatial Satellite Platform - Python Utility CLI")
        print("------------------------------------------------------------")
        print("Vertical Snapshot Resolution Standard: 480x720 px")
        print("\nDefault Monitored Sites:")
        for idx, p in enumerate(DEFAULT_PLACES, 1):
            x, y = lat_lng_to_tile(p["lat"], p["lng"], 16)
            print(f"  {idx}. {p['name']} | Category: {p['category']} | Coordinates: ({p['lat']}, {p['lng']}) | Tile Z16: ({x}, {y})")
        
        print("\nRun `python3 main.py --help` for available commands.")
        return

    if args.list:
        print(json.dumps(DEFAULT_PLACES, indent=2))

    elif args.analyze:
        matched = [p for p in DEFAULT_PLACES if args.analyze.lower() in p["name"].lower()]
        if matched:
            p = matched[0]
            report = simulate_change_analysis(p["name"], p["lat"], p["lng"])
        else:
            report = simulate_change_analysis(args.analyze, 0.0, 0.0)
        
        # Format report output
        if args.format == "text":
            report_content = (
                f"============================================================\n"
                f"       GEOGUARD SATELLITE INSPECTION REPORT                 \n"
                f"============================================================\n"
                f"Target Location : {report['place']}\n"
                f"Coordinates     : Lat {report['coordinates']['lat']}, Lng {report['coordinates']['lng']}\n"
                f"Resolution      : {report['verticalResolution']} (Vertical Portrait)\n"
                f"Web Mercator    : Tile ({report['webMercatorTile']['x']}, {report['webMercatorTile']['y']}) @ Zoom {report['webMercatorTile']['zoom']}\n"
                f"------------------------------------------------------------\n"
                f"Change Detected : {report['analysis']['changeDetected']}\n"
                f"Change Type     : {report['analysis']['changeType']}\n"
                f"Severity Level  : {report['analysis']['severity']}\n"
                f"Confidence Score: {report['analysis']['confidenceScore']}%\n"
                f"------------------------------------------------------------\n"
                f"EXECUTIVE SUMMARY:\n{report['analysis']['summary']}\n\n"
                f"AFFECTED SECTORS:\n" + "\n".join(f" - {s}" for s in report['analysis']['changedSectors']) + "\n\n"
                f"RECOMMENDED ACTIONS:\n" + "\n".join(f" - {a}" for a in report['analysis']['recommendedActions']) + "\n"
                f"============================================================\n"
            )
        else:
            report_content = json.dumps(report, indent=2)

        print(report_content)

        if args.output:
            try:
                with open(args.output, "w", encoding="utf-8") as f:
                    f.write(report_content)
                print(f"\n✅ Analysis report successfully extracted to file: {args.output}")
            except Exception as e:
                print(f"\n❌ Error extracting report to {args.output}: {e}")

    elif args.tile:
        lat, lng, zoom = float(args.tile[0]), float(args.tile[1]), int(args.tile[2])
        x, y = lat_lng_to_tile(lat, lng, zoom)
        print(json.dumps({
            "lat": lat,
            "lng": lng,
            "zoom": zoom,
            "tileX": x,
            "tileY": y,
            "snapshotDimensions": f"{VERTICAL_WIDTH}x{VERTICAL_HEIGHT} (Vertical Portrait)"
        }, indent=2))

    elif args.distance:
        l1, g1, l2, g2 = map(float, args.distance)
        dist = haversine_distance(l1, g1, l2, g2)
        print(f"Distance: {dist:.2f} km ({dist * 0.621371:.2f} miles)")

    elif args.check_server:
        check_server_health()

if __name__ == "__main__":
    main()
