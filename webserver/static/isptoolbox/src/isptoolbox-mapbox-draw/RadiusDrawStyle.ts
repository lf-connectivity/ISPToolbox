export const RadiusDrawStyle = [
  // polygon fill
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill',
    filter: [
      'all',
      ['==', '$type', 'Polygon'],
    ],
    paint: {
      'fill-color': '#1172a9',
      'fill-outline-color': '#1172a9',
      'fill-opacity': 0.4,
    },
  },
  {
    id: 'gl-draw-radius-label',
    type: 'symbol',
    filter: ['==', 'meta', 'currentPosition'],
    layout: {
      'text-field': '{radius}',
      'text-anchor': 'left',
      'text-offset': [1, 0],
      'text-size': 22,
    },
    paint: {
      'text-color': 'rgba(0, 0, 0, 1)',
      'text-halo-color': 'rgba(255, 255, 255, 1)',
      'text-halo-width': 3,
      'icon-opacity': {
        base: 1,
        stops: [
          [7.99, 1],
          [8, 0],
        ],
      },
      'text-halo-blur': 1,
    },
  },
  {
    'id': 'gl-draw-point-point-stroke-inactive-ap',
    'type': 'circle',
    'filter': ['all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Point'],
      ['==', 'meta', 'feature'],
      ['!=', 'mode', 'static'],
      ['has', 'user_uuid'],
    ],
    'paint': {
      'circle-radius': 7,
      'circle-opacity': 1,
      'circle-color': '#fff'
    }
  },
  {
    'id': 'gl-draw-point-inactive-ap',
    'type': 'circle',
    'filter': ['all',
      ['==', 'active', 'false'],
      ['==', '$type', 'Point'],
      ['==', 'meta', 'feature'],
      ['!=', 'mode', 'static'],
      ['has', 'user_uuid'],
    ],
    'paint': {
      'circle-radius': 6,
      'circle-color': '#3bb2d0'
    }
  },
  {
    'id': 'gl-draw-point-stroke-active-ap',
    'type': 'circle',
    'filter': ['all',
      ['==', '$type', 'Point'],
      ['==', 'active', 'true'],
      ['!=', 'meta', 'midpoint'],
      ['has', 'user_uuid'],
    ],
    'paint': {
      'circle-radius': 9,
      'circle-color': '#fff'
    }
  },
  {
    'id': 'gl-draw-point-active-ap',
    'type': 'circle',
    'filter': ['all',
      ['==', '$type', 'Point'],
      ['!=', 'meta', 'midpoint'],
      ['==', 'active', 'true'],
      ['has', 'user_uuid'],
    ],
    'paint': {
      'circle-radius': 7,
      'circle-color': '#fbb03b'
    }
  },
]