import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils import calc_centroid


def test_calc_centroid_basic():
    points = [
        {'lat': 0, 'lon': 0},
        {'lat': 10, 'lon': 10},
    ]
    result = calc_centroid(points)
    assert result['lat'] == 5
    assert result['lon'] == 5
