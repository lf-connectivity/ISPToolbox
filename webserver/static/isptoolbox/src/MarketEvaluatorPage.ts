// Create new mapbox Map
import * as MapboxGL from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MarketEvaluatorWS, {
    MarketEvaluatorWSResponse,
    RDOFGeojsonResponse,
    ZipGeojsonResponse,
    CountyGeojsonResponse,
    CensusBlockGeojsonResponse,
    ViewshedGeojsonResponse,
    MedianSpeedResponse,
    ServiceProvidersResponse,
    BroadbandNowResponse,
    BuildingOverlaysResponse,
    MedianIncomeResponse,
    UUID
} from "./MarketEvaluatorWS";
//@ts-ignore
import styles from "@mapbox/mapbox-gl-draw/src/lib/theme";

import { LinkMode, OverrideDirect, OverrideSimple, APDrawMode, OverrideDrawPolygon } from './isptoolbox-mapbox-draw/index';
import { ISPToolboxAbstractAppPage } from "./ISPToolboxAbstractAppPage";

export class MarketEvaluatorPage extends ISPToolboxAbstractAppPage {
    map: MapboxGL.Map;
    draw: MapboxDraw;
    marketEvalWS: MarketEvaluatorWS;
    currentRequestUUID: UUID;

    constructor() {
        let initial_map_center = { 'lon': 0, 'lat': 0 };
        let initial_zoom = 17;

        try {
            // @ts-ignore
            initial_map_center = window.ISPTOOLBOX_SESSION_INFO.initialMapCenter.coordinates;
            // @ts-ignore
            initial_zoom = window.ISPTOOLBOX_SESSION_INFO.initialMapZoom;
        } catch (err) { }

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: initial_map_center, // starting position [lng, lat]
            zoom: initial_zoom, // starting zoom
        });

        this.map.on('load', () => {
        });

        this.currentRequestUUID = '';
        this.marketEvalWS = new MarketEvaluatorWS([this.ws_message_handler.bind(this)]);
    }

    ws_message_handler(response: MarketEvaluatorWSResponse): void {
        // For now, only one active request at a time
        if (response.uuid !== this.currentRequestUUID) {
            return;
        }
        switch (response.type) {
            case 'building.overlays':
                const buildings: BuildingOverlaysResponse = response.value as BuildingOverlaysResponse;
                // TODO: Handle building overlays
                break;
            case 'median.income':
                const medianIncome: MedianIncomeResponse = response.value as MedianIncomeResponse;
                // TODO: Handle median income
                break;
            case 'service.providers':
                const serviceProviders: ServiceProvidersResponse = response.value as ServiceProvidersResponse;
                // TODO: Handle service providers
                break;
            case 'broadband.now':
                const broadBandNow: BroadbandNowResponse = response.value as BroadbandNowResponse;
                // TODO: Handle broadband now
                break;
            case 'median.speeds':
                const medianSpeeds: MedianSpeedResponse = response.value as MedianSpeedResponse;
                // TODO: Handle median speeds
                break;
            case 'polygon.area':
                const polygonArea: number = parseFloat(response.value as string);
                // TODO: Handle polygon area
                break;
            case 'grant.geog':
                const grantGeog: RDOFGeojsonResponse = response.value as RDOFGeojsonResponse;
                // TODO: Handle grant geography
                break;
            case 'zip.geog':
                const zipGeog: ZipGeojsonResponse = response.value as ZipGeojsonResponse;
                // TODO: Handle zip geography
                break;
            case 'county.geog':
                const countyGeog: CountyGeojsonResponse = response.value as CountyGeojsonResponse;
                // TODO: Handle county geography
                break;
            case 'censusblock.geog':
                const censusBlockGeog: CensusBlockGeojsonResponse = response.value as CensusBlockGeojsonResponse;
                // TODO: Handle census block geography
                break;
            case 'tower.viewshed':
                const viewshed: ViewshedGeojsonResponse = response.value as ViewshedGeojsonResponse;
                // TODO: Handle viewshed
                break;
            case 'error':
                const err: string = response.value as string;
                // TODO: Handle error
                break;
        }
    }
}