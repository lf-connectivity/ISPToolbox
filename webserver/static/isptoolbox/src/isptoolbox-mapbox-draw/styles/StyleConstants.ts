import { WorkspaceFeatureTypes } from "../../workspace/WorkspaceConstants";

const SERVICEABLE_BUILDINGS_COLOR = '#34eb46';
const UNSERVICEABLE_BUILDINGS_COLOR = '#ff2f00';
const UNKNOWN_BUILDINGS_COLOR = '#ccc';

export {
    SERVICEABLE_BUILDINGS_COLOR,
    UNSERVICEABLE_BUILDINGS_COLOR,
    UNKNOWN_BUILDINGS_COLOR
}

export const AP_STYLES = [
    // INACTIVE AP
    {
        'id': 'gl-draw-point-ap-halo-inactive',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 11,
            'circle-color': '#FFFFFF'
        }
    },
    {
        'id': 'gl-draw-point-ap-inactive',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 10,
            'circle-color': '#5692D1'
        }
    },
    {
        'id': 'gl-draw-point-ap-symbol-inactive',
        'type': 'symbol',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
        ],
        layout: {
            'icon-image': 'ap-inactive-isptoolbox', // reference the image
            'icon-size': 0.25
        },
    },
    // ACTIVE AP
    {
        'id': 'gl-draw-point-ap-halo-active',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', 'active', 'true'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 13,
            'circle-color': '#FFFFFF'
        }
    },
    {
        'id': 'gl-draw-point-ap-active',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', 'active', 'true'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 10,
            'circle-color': '#5692D1'
        }
    },
    {
        'id': 'gl-draw-point-ap-symbol-active',
        'type': 'symbol',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'active', 'true'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.AP],
            ['==', '$type', 'Point'],
        ],
        layout: {
            'icon-image': 'ap-active-isptoolbox', // reference the image
            'icon-size': 0.25
        },
    },
]

export const CPE_STYLES = [
    // Default CPE Appearance
    // INACTIVE CPE
    {
        'id': 'gl-draw-point-cpe-halo-inactive',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 11,
            'circle-color': '#FFFFFF'
        }
    },
    {
        'id': 'gl-draw-point-cpe-inactive',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', 'active', 'false'],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 10,
            'circle-color': '#5692D1'
        }
    },
    {
        'id': 'gl-draw-point-cpe-symbol-inactive',
        'type': 'symbol',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'active', 'false'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', '$type', 'Point'],
        ],
        layout: {
            'icon-image': 'cpe-inactive-isptoolbox', // reference the image
            'icon-size': 0.3
        },
    },
    // ACTIVE CPE
    {
        'id': 'gl-draw-point-cpe-halo-active',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'active', 'true'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 12,
            'circle-color': '#FFFFFF'
        }
    },
    {
        'id': 'gl-draw-point-cpe-active',
        'type': 'circle',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'active', 'true'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', '$type', 'Point'],
            ['!=', 'mode', 'static']
        ],
        'paint': {
            'circle-radius': 10,
            'circle-color': '#5692D1'
        }
    },
    {
        'id': 'gl-draw-point-cpe-symbol-active',
        'type': 'symbol',
        'filter': [ 'all',
            ['has', 'user_feature_type'],
            ['==', 'active', 'true'],
            ['==', 'user_feature_type', WorkspaceFeatureTypes.CPE],
            ['==', '$type', 'Point'],
        ],
        layout: {
            'icon-image': 'cpe-inactive-isptoolbox', // reference the image
            'icon-size': 0.3
        },
    },
]

export const DRAW_LINK_STYLES = [
    
]