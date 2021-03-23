export const LOSCheckMapboxStyles = [
    {
        'id': 'gl-draw-polygon-midpoint',
        'type': 'circle',
        'filter': ['all',
          ["literal", false]],
        'paint': {
          'circle-radius': 3,
          'circle-color': '#fbb03b'
        }
      },
    // Standard Link Styling - unselected
    {
        'id': 'gl-draw-line-inactive-link',
        'type': 'line',
        'filter': ['all', ['==', 'active', 'false'],
            ['==', '$type', 'LineString'],
            ['!=', 'mode', 'static']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#5692D1',
            'line-width': 5
        }
    },
    // Styling Selected Links
    {
        'id': 'gl-draw-line-active',
        'type': 'line',
        'filter': ['all', ['==', '$type', 'LineString'],
            ['==', 'active', 'true']
        ],
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#5692D1',
            'line-dasharray': [0.2, 2],
            'line-width': 5
        }
    },
    // Halos around radios - unselected
    {
        'id': 'gl-draw-polygon-and-line-vertex-inactive-halo-link',
        'type': 'circle',
        'filter': ['all',
          ["==", "$type", "LineString"],
          ["!=", "mode", "static"],
          ['==', 'active', 'false'],
        ],
        'paint': {
            "circle-radius": 5,
            "circle-color": "#ffffff"
        }
    },
    {
        'id': 'gl-draw-polygon-and-line-vertex-inactive-link',
        'type': 'circle',
        'filter': ['all',
          ["==", "$type", "LineString"],
          ["!=", "mode", "static"],
          ['==', 'active', 'false'],
        ],
        'paint': {
            "circle-radius": 3,
            "circle-color": "#3bb2d0"
        }
    },
    // // Default Circle Appearance
    // {
    //     'id': 'gl-draw-point-inactive-link',
    //     'type': 'circle',
    //     'filter': ['all', ['==', 'active', 'false'],
    //         ['==', '$type', 'Point'],
    //         ['!=', 'mode', 'static']
    //     ],
    //     'paint': {
    //         'circle-radius': 10,
    //         'circle-color': '#FFFFFF'
    //     }
    // },
    // Radio styling 
    {
        'id': 'selected_radio_render',
        'type': 'circle',
        'filter': [
            'all',
            ['==', 'meta', 'radio_point']
        ],
        'paint': {
            'circle-radius': 5,
            'circle-color': ['get', "color"],
        },
    },
    // polygon outline stroke
    // This doesn't style the first edge of the polygon, which uses the line stroke styling instead
    {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: [
            'all',
            ['==', '$type', 'Polygon'],
            ['!=', 'mode', 'static'],
        ],
        layout: {
            'line-cap': 'round',
            'line-join': 'round',
        },
        paint: {
            'line-color': '#1172A9',
            'line-width': 4,
        },
    },
    // Drawing Instructions
    {
        id: 'gl-draw-instructions',
        type: 'symbol',
        filter: ['all', ['==', '$type', 'Point'], ['has', 'draw_guide']],
        paint: {
            'text-halo-width': 1,
            'text-halo-color': 'rgba(0,0,0,1)',
            'text-color': 'rgba(194,216,236,1)',
        },
        layout: {
            'text-field': ['get', 'draw_guide'],
            'text-font': ['Arial Unicode MS Bold'],
            'text-justify': 'center',
            'text-offset': [0, 3],
            'text-size': 13,
            'text-letter-spacing': 0.03,
        },
    },
];