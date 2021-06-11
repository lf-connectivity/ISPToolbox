#!/usr/bin/env python3
import json
import argparse
import sys

parser = argparse.ArgumentParser(description='Covert json file into geojson for qgis rendering')
parser.add_argument('infile', nargs='?', type=argparse.FileType('r'),
                     default=sys.stdin)
parser.add_argument('outfile', nargs='?', type=argparse.FileType('w'),
                     default=sys.stdout)
args = parser.parse_args()

input_geojson = json.load(args.infile)

fc = {
    'type': 'FeatureCollection',
    'features': [
        {
            'type': 'Feature',
            'geometry': geometry,
            'properties': {} 
        }
    for geometry in input_geojson['geometries']
    ]
}


json.dump(fc, args.outfile)