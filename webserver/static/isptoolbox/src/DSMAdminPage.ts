// Create new mapbox Map
import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

import { OverrideDirect, OverrideSimple } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from './ISPToolboxAbstractAppPage';
import { AdminLidarAvailabilityLayer } from './availabilityOverlay';

export class DSMAdminPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;

    constructor() {
        super(
            {
                simple_select: OverrideSimple(),
                direct_select: OverrideDirect()
            },
            'edit_network'
        );
        this.windowResizeCallback();
        window.addEventListener('resize', this.windowResizeCallback);
    }

    windowResizeCallback() {
        if (this.map?.resize) {
            this.map.resize();
        }
    }

    onMapLoad() {
        new AdminLidarAvailabilityLayer(this.map);

        // Who cares about code quality it's an admin panel
        $('#content').css('height', '85vh');
        $('#map').css('height', '100%');
        $('#map').css('width', '100%');
        this.map.resize();
    }

    onGeocoderLoad() {}
}
