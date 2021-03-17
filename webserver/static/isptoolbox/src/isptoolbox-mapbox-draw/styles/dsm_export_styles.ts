export const dsmExportStyles = [
    {
        id: 'gl-draw-polygon-midpoint',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
        paint: {
            'circle-radius': 6,
            'circle-color': '#fbb03b',
        },
    },
    // polygon fill
    {
        id: 'gl-draw-polygon-fill-not-static',
        type: 'fill',
        filter: [
        'all',
        ['==', '$type', 'Polygon'],
        ['!=', 'mode', 'static'],
        ],
        paint: {
        'fill-color': '#1172a9',
        'fill-outline-color': '#1172a9',
        'fill-opacity': 0.4,
        },
    }
];