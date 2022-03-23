import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from "../utils/IMapboxDrawPlugin";
import { WorkspaceFeatureTypes } from "../workspace/WorkspaceConstants";

export enum LinkProfileDisplayOption {
    LINK_CHART = 'link_chart',
    DRAWING_INSTRUCTIONS = 'drawing_instructions',
    LOADING_CHART = 'loading_spinner',
    LOADING_ERROR = 'loading_failed_spinner'
}

export class LinkProfileView implements IMapboxDrawPlugin {
    constructor(private map: mapboxgl.Map, private draw: MapboxDraw) {
        initializeMapboxDrawInterface(this, map);
    }

    drawSelectionChangeCallback (e: { features: Array<GeoJSON.Feature> }): void {
        const features = e.features;
        if(features.length === 1)
        {
            const feat = features[0];
            if(feat.geometry.type === 'LineString' && feat.properties?.feature_type !== WorkspaceFeatureTypes.AP_CPE_LINK)
            {
                this.showSwatch();
            } else {
                this.showIcons();
            }
        }
    }

    showSwatch(){
        $('.ptp-swatch').removeClass('d-none');
        $('.ptp-icon').addClass('d-none');
    }
    
    showIcons(){
        $('.ptp-swatch').addClass('d-none');
        $('.ptp-icon').removeClass('d-none');
    }

    render(display: LinkProfileDisplayOption) {
        for (let option in LinkProfileDisplayOption) {
            if (Object(LinkProfileDisplayOption)[option] === display) {
                $(`#${Object(LinkProfileDisplayOption)[option]}`).removeClass('d-none');
            } else {
                $(`#${Object(LinkProfileDisplayOption)[option]}`).addClass('d-none');
            }
        }

        if (display === LinkProfileDisplayOption.LINK_CHART) {
            $('#3D-view-btn').removeClass('d-none');
            $('#los-chart-tooltip-button').removeClass('d-none');
            $('#link-title').removeClass('d-none');
        } else {
            $('#los-chart-tooltip-button').addClass('d-none');
            $('#3D-view-btn').addClass('d-none');
        }

        if (display === LinkProfileDisplayOption.DRAWING_INSTRUCTIONS) {
            $('.radio-card-body').addClass('d-none');
            $('#link-title').addClass('d-none');
        } else {
            $('.radio-card-body').removeClass('d-none');
            $('#link-title').removeClass('d-none');
        }
    }
}
