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

export function createSupplementaryPointsForCircle(geojson) {
    console.log(geojson);
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
      supplementaryPoints.push(
        createVertex(properties.id, vertices[index], `0.${index}`, false),
      );
    }
    return supplementaryPoints;
  }