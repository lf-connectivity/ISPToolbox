import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl, { VideoSource } from 'mapbox-gl';
import {
    CbrsOverlayPopup,
    CensusBlocksOverlayPopup,
    CommunityConnectOverlayPopup,
    RdofOverlayPopup,
    TribalOverlayPopup
} from '../isptoolbox-mapbox-draw/popups/MarketEvaluatorOverlayPopups';
import MarketEvaluatorWS, { MarketEvalWSEvents } from '../MarketEvaluatorWS';
import { WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';
import MapboxOverlay from './MapboxOverlay';

export type GeoOverlay = {
    sourceId: string;
    fills: string;
    borders: string;
    hover: boolean;
    color: string;
    outlineOnly: boolean;
};

abstract class MapboxGeoOverlay implements MapboxOverlay {
    map: mapboxgl.Map;
    draw: MapboxDraw;
    sourceId: string;
    fillsId: string;
    bordersId: string;
    sourceUrl: string;
    sourceLayer: string;
    color: string;
    outlineOnly: boolean;
    hoverFeature: string | number | undefined;
    popup: any;

    boundMouseMoveCallback: (e: any) => void;
    boundMouseLeaveCallback: () => void;
    boundMouseClickCallback: (e: any) => void;

    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string,
        popupClass: any,
        wsGeojsonEvent: MarketEvalWSEvents
    ) {
        this.map = map;
        this.draw = draw;
        this.sourceId = overlay.sourceId;
        this.fillsId = overlay.fills;
        this.bordersId = overlay.borders;
        this.sourceUrl = sourceUrl;
        this.sourceLayer = sourceLayer;
        this.color = overlay.color;
        this.outlineOnly = overlay.outlineOnly;
        this.popup = popupClass.getInstance();

        this.boundMouseMoveCallback = this.mouseMoveCallback.bind(this);
        this.boundMouseLeaveCallback = this.mouseLeaveCallback.bind(this);
        this.boundMouseClickCallback = this.mouseClickCallback.bind(this);

        PubSub.subscribe(wsGeojsonEvent, this.receiveGeojsonCallback.bind(this));
    }

    mouseMoveCallback(e: any) {
        const features = e.features;
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = 'pointer';
        }
        if (this.hoverFeature !== undefined) {
            this.map.setFeatureState(
                {
                    source: this.sourceId,
                    sourceLayer: this.sourceLayer,
                    id: this.hoverFeature
                },
                { hover: false }
            );
            this.popup.hide();
        }
        this.hoverFeature = undefined;
        if (features && features.length) {
            this.hoverFeature = features[0].id;
            this.map.setFeatureState(
                {
                    source: this.sourceId,
                    sourceLayer: this.sourceLayer,
                    id: this.hoverFeature
                },
                { hover: true }
            );

            this.popup.setFeature(features[0]);
            this.popup.setLngLat(e.lngLat);
            this.popup.show();
        }
    }

    mouseLeaveCallback() {
        if (!this.hoverFeature) {
            return;
        }
        this.map.setFeatureState(
            {
                source: this.sourceId,
                sourceLayer: this.sourceLayer,
                id: this.hoverFeature
            },
            { hover: false }
        );
        const canvas = this.map.getCanvas();
        if (canvas) {
            canvas.style.cursor = '';
        }
        this.popup.hide();
    }

    mouseClickCallback(e: any) {
        if (e.features && e.features.length) {
            this.sendGeojsonRequest(e.features[0].properties);
        }
    }

    receiveGeojsonCallback(msg: string, response: any) {
        if (response.error == 0) {
            let properties = { ...response };
            delete properties.error;
            delete properties.geojson;

            const newFeature = {
                type: 'Feature',
                geometry: JSON.parse(response.geojson),
                properties: {
                    ...properties,
                    uneditable: true,
                    feature_type: WorkspaceFeatureTypes.COVERAGE_AREA
                },
                id: ''
            };
            // @ts-ignore
            let id = this.draw.add(newFeature)[0];
            newFeature.id = id;
            this.map.fire('draw.create', { features: [newFeature] });
            this.draw.changeMode('simple_select', { featureIds: [id] });
            this.map.fire('draw.selectionchange', { features: [newFeature] });
        }
    }

    show() {
        this.map.addSource(this.sourceId, {
            type: 'vector',
            url: `${this.sourceUrl}?optimize=true`
        });
        if (this.outlineOnly) {
            this.map.addLayer({
                id: this.fillsId,
                type: 'fill',
                source: this.sourceId,
                'source-layer': this.sourceLayer,
                layout: {},
                paint: {
                    'fill-color': this.color,
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        0.34,
                        0
                    ]
                }
            });
        } else {
            this.map.addLayer({
                id: this.fillsId,
                type: 'fill',
                source: this.sourceId,
                'source-layer': this.sourceLayer,
                layout: {},
                paint: {
                    'fill-color': this.color,
                    'fill-opacity': 0.34
                }
            });
        }
        this.map.addLayer({
            id: this.bordersId,
            type: 'line',
            source: this.sourceId,
            'source-layer': this.sourceLayer,
            layout: {},
            paint: {
                'line-color': this.color,
                'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 1]
            }
        });

        this.map.on('mousemove', this.fillsId, this.boundMouseMoveCallback);
        this.map.on('mouseleave', this.fillsId, this.boundMouseLeaveCallback);
        this.map.on('click', this.fillsId, this.boundMouseClickCallback);
    }

    remove() {
        this.map.getLayer(this.fillsId) && this.map.removeLayer(this.fillsId);
        this.map.getLayer(this.bordersId) && this.map.removeLayer(this.bordersId);
        this.map.getSource(this.sourceId) && this.map.removeSource(this.sourceId);
        this.map.off('mousemove', this.fillsId, this.boundMouseMoveCallback);
        this.map.off('mouseleave', this.fillsId, this.boundMouseLeaveCallback);
        this.map.off('click', this.fillsId, this.boundMouseClickCallback);
    }

    abstract sendGeojsonRequest(featureProperties: any): void;
}

export class RdofGeoOverlay extends MapboxGeoOverlay {
    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string
    ) {
        super(
            map,
            draw,
            overlay,
            sourceUrl,
            sourceLayer,
            RdofOverlayPopup,
            MarketEvalWSEvents.RDOF_GEOG_MSG
        );
    }

    sendGeojsonRequest(properties: any) {
        MarketEvaluatorWS.getInstance().sendRDOFRequest(properties.cbg_id);
    }
}

export class CommunityConnectGeoOverlay extends MapboxGeoOverlay {
    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string
    ) {
        super(
            map,
            draw,
            overlay,
            sourceUrl,
            sourceLayer,
            CommunityConnectOverlayPopup,
            MarketEvalWSEvents.ZIP_GEOG_MSG
        );
    }

    sendGeojsonRequest(properties: any) {
        MarketEvaluatorWS.getInstance().sendZipRequest(properties.zipcode);
    }
}

export class CbrsGeoOverlay extends MapboxGeoOverlay {
    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string
    ) {
        super(
            map,
            draw,
            overlay,
            sourceUrl,
            sourceLayer,
            CbrsOverlayPopup,
            MarketEvalWSEvents.COUNTY_GEOG_MSG
        );
    }

    sendGeojsonRequest(properties: any) {
        MarketEvaluatorWS.getInstance().sendCountyRequest(
            properties.countycode,
            properties.statecode
        );
    }
}

export class CensusBlocksGeoOverlay extends MapboxGeoOverlay {
    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string
    ) {
        super(
            map,
            draw,
            overlay,
            sourceUrl,
            sourceLayer,
            CensusBlocksOverlayPopup,
            MarketEvalWSEvents.CENSUSBLOCK_GEOG_MSG
        );
    }

    sendGeojsonRequest(properties: any) {
        MarketEvaluatorWS.getInstance().sendCensusBlockRequest(properties.fullblockcode);
    }
}

export class TribalGeoOverlay extends MapboxGeoOverlay {
    constructor(
        map: mapboxgl.Map,
        draw: MapboxDraw,
        overlay: GeoOverlay,
        sourceUrl: string,
        sourceLayer: string
    ) {
        super(
            map,
            draw,
            overlay,
            sourceUrl,
            sourceLayer,
            TribalOverlayPopup,
            MarketEvalWSEvents.TRIBAL_GEOG_MSG
        );
    }

    sendGeojsonRequest(properties: any) {
        MarketEvaluatorWS.getInstance().sendTribalRequest(properties.GEOID);
    }
}
