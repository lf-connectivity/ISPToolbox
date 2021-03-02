import {Constants} from 'mapbox-gl-draw-circle';
const extent = require('@mapbox/geojson-extent');
// create a circle-like polygon given a center point and radius
// https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js/39006388#39006388
export function createGeoJSONCircle(center, radiusInKm, parentId, points = 64) {
    const coords = {
        latitude: center[1],
        longitude: center[0],
    };

    const km = radiusInKm;

    const ret = [];
    const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.574;

    let theta;
    let x;
    let y;
    for (let i = 0; i < points; i += 1) {
        theta = (i / points) * (2 * Math.PI);
        x = distanceX * Math.cos(theta);
        y = distanceY * Math.sin(theta);

        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [ret],
        },
        properties: {
            parent: parentId,
        },
    };
}

function createVertex(parentId, coordinates, path, selected) {
    return {
      type: "Feature",
      properties: {
        meta: 'vertex',
        parent: parentId,
        coord_path: path,
        active: selected
          ? 'active'
          : 'inactive',
        handles: 'true',
      },
      geometry: {
        type: 'Point',
        coordinates,
      },
    };
}
export function lineDistance(coord1, coord2, unit = 'K') {
  const lat1 = coord1[1];
  const lat2 = coord2[1];
  const lon1 = coord1[0];
  const lon2 = coord2[0];

  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  } else {
    var radlat1 = (Math.PI * lat1) / 180;
    var radlat2 = (Math.PI * lat2) / 180;
    var theta = lon1 - lon2;
    var radtheta = (Math.PI * theta) / 180;
    var dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == 'K') {
      dist = dist * 1.609344;
    }
    if (unit == 'N') {
      dist = dist * 0.8684;
    }
    return dist;
  }
}

export function createSupplementaryPointsForCircle(geojson) {
    const {properties, geometry} = geojson;

    if (!properties.user_isCircle) {
      return null;
    }
    const supplementaryPoints = [];
    const vertices = geometry.coordinates[0].slice(0, -1);
    for (
      let index = 0;
      index < vertices.length;
      index += Math.round(vertices.length / 4)
    ) {
      const vertex = createVertex(properties.id, vertices[index], `0.${index}`, false);
      vertex.properties.handle = 'true';
      supplementaryPoints.push(
        vertex
      );
    }
    return supplementaryPoints;
}