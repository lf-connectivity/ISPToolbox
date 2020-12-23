export const LOSCheckMapboxStyles = [
    // Standard Link Styling - unselected
    {
        'id': 'gl-draw-line-inactive',
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
            'line-color': '#fbb03b',
            'line-dasharray': [0.2, 2],
            'line-width': 5
        }
    },
    // Halos around radios - unselected
    {
        "id": "gl-draw-polygon-and-line-vertex-halo-active",
        "type": "circle",
        "filter": ["all", ["==", "$type", "LineString"]],
        "paint": {
            "circle-radius": 10,
            "circle-color": "#5692D1"
        }
    },
    // Default Circle Appearance
    {
        'id': 'gl-draw-point-inactive',
        'type': 'circle',
        'filter': ['all', ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 10,
            'circle-color': '#FFFFFF'
        }
    },
    // Radio styling 
    {
        'id': 'selected_radio_render',
        'type': 'circle',
        'filter': [
          'all',
          ['==', 'meta', 'radio_point']
        ],
        'paint': {
          'circle-radius': 7,
          'circle-color': ['get', "color"],
        },
    },
];