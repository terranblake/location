from __future__ import annotations


def calc_centroid(points):
    if not points:
        raise ValueError("points must not be empty")
    lat = sum(p['lat'] for p in points) / len(points)
    lon = sum(p['lon'] for p in points) / len(points)
    return {'lat': lat, 'lon': lon}
