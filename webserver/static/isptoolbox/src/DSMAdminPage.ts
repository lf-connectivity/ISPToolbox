// Create new mapbox Map
import * as MapboxGL from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

import { OverrideDirect, OverrideSimple } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from './ISPToolboxAbstractAppPage';
import { AdminLidarAvailabilityLayer } from './availabilityOverlay';

export class DSMAdminPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    adminLayer: AdminLidarAvailabilityLayer;

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
        this.adminLayer = new AdminLidarAvailabilityLayer(this.map);

        // Who cares about code quality it's an admin panel
        $('#content').css('height', '85vh');
        $('#map').css('height', '100%');
        $('#map').css('width', '100%');
        this.map.resize();

        // @ts-ignore
        if (window.ISPTOOLBOX_SESSION_INFO.result !== null) {
            // @ts-ignore
            this.adminLayer.queryLocation(window.ISPTOOLBOX_SESSION_INFO.result);
        }
    }

    onGeocoderLoad() {
        this.geocoder.on('result', ({ result }: any) => {
            let [x, y] = result.center;

            // @ts-ignore
            this.adminLayer.queryLocation({ lng: x, lat: y });

            //@ts-ignore
            this.geocoder.clear();
        });
    }
}
