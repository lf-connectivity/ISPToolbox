const circle = require('@turf/circle').default;
import * as Constants from '@mapbox/mapbox-gl-draw/src/constants';

// create a circle-like polygon given a center point and radius
// https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js/39006388#39006388
export function createGeoJSONCircle(center, radiusInKm, parentId, points = 64) {
    const ret = circle(center, radiusInKm, {steps: points, properties: {
      parent: parentId,
    }});
    return ret;
}

export function createVertex(parentId, coordinates, path, selected) {
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

    if (!properties.user_radius) {
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

export function createSupplementaryPointsForGeojson(geojson, options = {}, basePath = null) {
  const { type, coordinates } = geojson.geometry;
  const featureId = geojson.properties && geojson.properties.id;

  let supplementaryPoints = [];

  if (type === Constants.geojsonTypes.POINT) {
    // For points, just create a vertex
    supplementaryPoints.push(
      createVertex(featureId, coordinates, basePath, isSelectedPath(basePath)),
    );
  } else if (type === Constants.geojsonTypes.POLYGON) {
    // Cycle through a Polygon's rings and
    // process each line
    coordinates.forEach((line, lineIndex) => {
      processLine(
        line,
        basePath !== null ? `${basePath}.${lineIndex}` : String(lineIndex),
      );
    });
  } else if (type === Constants.geojsonTypes.LINE_STRING) {
    processLine(coordinates, basePath);
  } else if (type.indexOf(Constants.geojsonTypes.MULTI_PREFIX) === 0) {
    processMultiGeometry();
  }

  function processLine(line, lineBasePath) {
    let firstPointString = '';
    let lastVertex = null;
    line.forEach((point, pointIndex) => {
      const pointPath =
        lineBasePath !== undefined && lineBasePath !== null
          ? `${lineBasePath}.${pointIndex}`
          : String(pointIndex);
      const vertex = createVertex(
        featureId,
        point,
        pointPath,
        isSelectedPath(pointPath),
      );

      // If we're creating midpoints, check if there was a
      // vertex before this one. If so, add a midpoint
      // between that vertex and this one.
      if (!options.uneditable && options.midpoints && lastVertex) {
        const midpoint = createMidpoint(
          featureId,
          lastVertex,
          vertex,
          options.map,
        );
        if (midpoint) {
          supplementaryPoints.push(midpoint);
        }
      }
      lastVertex = vertex;

      // A Polygon line's last point is the same as the first point. If we're on the last
      // point, we want to draw a midpoint before it but not another vertex on it
      // (since we already a vertex there, from the first point).
      const stringifiedPoint = JSON.stringify(point);
      if (!options.uneditable && firstPointString !== stringifiedPoint) {
        supplementaryPoints.push(vertex);
      }
      if (pointIndex === 0) {
        firstPointString = stringifiedPoint;
      }
    });
  }

  function isSelectedPath(path) {
    if (!options.selectedPaths) {
      return false;
    }
    return options.selectedPaths.indexOf(path) !== -1;
  }

  // Split a multi-geometry into constituent
  // geometries, and accumulate the supplementary points
  // for each of those constituents
  function processMultiGeometry() {
    const subType = type.replace(Constants.geojsonTypes.MULTI_PREFIX, '');
    // $FlowFixMe[prop-missing]
    coordinates.forEach((subCoordinates, index) => {
      const subFeature = {
        type: Constants.geojsonTypes.FEATURE,
        properties: geojson.properties,
        geometry: {
          type: subType,
          coordinates: subCoordinates,
        },
      };
      supplementaryPoints = supplementaryPoints.concat(
        // $FlowFixMe[incompatible-call]
        createSupplementaryPointsForGeojson(subFeature, options, index),
      );
    });
  }

  return supplementaryPoints;
}

function createMidpoint(parent, startVertex, endVertex, map) {
  const startCoord = startVertex.geometry.coordinates;
  const endCoord = endVertex.geometry.coordinates;

  // If a coordinate exceeds the projection, we can't calculate a midpoint,
  // so run away
  if (
    startCoord[1] > Constants.LAT_RENDERED_MAX ||
    startCoord[1] < Constants.LAT_RENDERED_MIN ||
    endCoord[1] > Constants.LAT_RENDERED_MAX ||
    endCoord[1] < Constants.LAT_RENDERED_MIN
  ) {
    return null;
  }
  const ptA = map.project([startCoord[0], startCoord[1]]);
  const ptB = map.project([endCoord[0], endCoord[1]]);
  const mid = map.unproject([(ptA.x + ptB.x) / 2, (ptA.y + ptB.y) / 2]);

  return {
    type: Constants.geojsonTypes.FEATURE,
    properties: {
      meta: Constants.meta.MIDPOINT,
      parent,
      lng: mid.lng,
      lat: mid.lat,
      coord_path: endVertex.properties.coord_path,
    },
    geometry: {
      type: Constants.geojsonTypes.POINT,
      coordinates: [mid.lng, mid.lat],
    },
  };
}