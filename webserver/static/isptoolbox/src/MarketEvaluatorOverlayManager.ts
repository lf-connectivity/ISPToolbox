/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * Controls overlay for Market Sizing Tools
 *
 */


import MapboxGL from 'mapbox-gl';
import { CbrsOverlayPopup, CensusBlocksOverlayPopup, CommunityConnectOverlayPopup, RdofOverlayPopup, TribalOverlayPopup } from './isptoolbox-mapbox-draw/popups/MarketEvaluatorOverlayPopups';
import MapboxGeoOverlay, {GeoOverlay} from './molecules/MapboxGeoOverlay';
import MapboxOverlay from './molecules/MapboxOverlay';

type GeoLayerString = 'rdof' | 'communityConnect' | 'cbrs' | 'censusBlocks' | 'tribal';

type OverlaySourceLayer = {
    rdof: {
        sourceUrl: string,
        sourceLayer: string,
    },
    tower: {
        sourceUrl: string,
        sourceLayer: string,
    },
    communityConnect: {
        sourceUrl: string,
        sourceLayer: string,
    },
    cbrs: {
        sourceUrl: string,
        sourceLayer: string,
    },
    censusBlocks: {
        sourceUrl: string,
        sourceLayer: string,
    },
    tribal: {
        sourceUrl: string,
        sourceLayer: string,
    }
};

type accum = {
    'community-connect-overlay-fills': number,
    'rdof2020-overlay-fills': number,
    'tower-overlay-label': number,
    'cbrs-overlay-fills': number,
    'census-block-overlay-fills': number,
    'tribal-overlay-fills': number,
};

const geoOverlays: {[key in GeoLayerString]: GeoOverlay} = {
    rdof: {
        sourceId: 'rdof2020-overlay',
        fills: 'rdof2020-overlay-fills',
        borders: 'rdof2020-overlay-borders',
        hover: true,
        color: '#9540EA',
        outlineOnly: false,
    },
    communityConnect: {
        sourceId: 'community-connect-overlay',
        fills: 'community-connect-overlay-fills',
        borders: 'community-connect-overlay-borders',
        hover: true,
        color: '#EA625A',
        outlineOnly: false,
    },
    cbrs: {
        sourceId: 'cbrs-overlay',
        fills: 'cbrs-overlay-fills',
        borders: 'cbrs-overlay-borders',
        hover: true,
        color: '#91ED65',
        outlineOnly: true,
    },
    censusBlocks: {
        sourceId: 'census-block-overlay',
        fills: 'census-block-overlay-fills',
        borders: 'census-block-overlay-borders',
        hover: true,
        color: '#F0F2F5',
        outlineOnly: true,
    },
    tribal: {
        sourceId: 'tribal-overlay',
        fills: 'tribal-overlay-fills',
        borders: 'tribal-overlay-borders',
        hover: true,
        color: '#FF4D00',
        outlineOnly: false,
    },
}

const overlay = {
    sourceId: {
        tower: 'tower-overlay',
        towerCoverage: 'tower-coverage-layer',
        towerSelected: 'tower-selected-overlay',
        anchorInstitutions: 'anchor-inst-source',
        buildingOutlines: 'building-outlines-source',
    },
    layer: {
        tower: 'tower-overlay-label',
        towerCoverage: 'tower-fills',
        towerSelected: 'tower-overlay-selected-label',
        anchorInstitutions: 'anchor-inst-layer',
        buildingOutlines: 'building-outlines-layer',
    },
    layerId: {
        tower: { labels: 'tower-overlay-label', fills: '', borders: '' },
        towerCoverage: {
            fills: 'tower-coverage-fills',
            borders: 'tower-coverage-borders',
        },
    },
    // layerIdPriority[0] < layerIdPriority[1] < layerIdPriority[2] < ...
    layerIdPriority: [
        'community-connect-overlay-fills',
        'rdof2020-overlay-fills',
        'cbrs-overlay-fills',
        'census-block-overlay-fills',
        'tribal-overlay-fills',
        'building-outlines-layer',
        'tower-overlay-label',
        'tower-overlay-selected-label',
        'anchor-inst-layer',
    ],
    hover: {
        tower: false,
    },
    sourceLayerInit: {
        rdof: {
            sourceUrl: '',
            sourceLayer: '',
        },
        tower: {
            sourceUrl: '',
            sourceLayer: '',
        },
        communityConnect: {
            sourceUrl: '',
            sourceLayer: '',
        },
        cbrs: {
            sourceUrl: '',
            sourceLayer: '',
        },
        censusBlocks: {
            sourceUrl: '',
            sourceLayer: '',
        },
        tribal: {
            sourceUrl: '',
            sourceLayer: '',
        },
    },
};

export default class MarketEvaluatorOverlayManager {
    map: MapboxGL.Map;
    sources: OverlaySourceLayer;
    activeGeoSource: GeoLayerString | null;
    overlays:  {[key in GeoLayerString]: MapboxOverlay};
    static _instance: MarketEvaluatorOverlayManager;

    constructor(map: MapboxGL.Map) {
        if (MarketEvaluatorOverlayManager._instance) {
            throw Error("This singleton has already been instantiated, use getInstance.");
        }
        this.map = map;
        this.sources = overlay.sourceLayerInit;
        this.activeGeoSource = null;
        new RdofOverlayPopup(this.map);
        new CommunityConnectOverlayPopup(this.map);
        new CbrsOverlayPopup(this.map);
        new CensusBlocksOverlayPopup(this.map);
        new TribalOverlayPopup(this.map);

        this.populateOverlays();

        $(`#map-layers-btn`).on('click', (event) => {
            $(`#map`).toggleClass(["col-md-6", "col-md-9"]);
            $(`#map`).toggleClass(["col-lg-7", "col-lg-9"]);
            this.map.resize();
        });

        for (const lString in this.sources) {
            const layerKey: GeoLayerString = lString as GeoLayerString;
            $(`#switch-${layerKey}`).on('click', () => {
                if (this.activeGeoSource === layerKey){
                    // Toggled off, remove source
                    this.overlays[layerKey].remove();
                    this.activeGeoSource = null;
                } else {
                    // Remove mutually exclusive sources
                    if (this.activeGeoSource){
                        this.overlays[this.activeGeoSource].remove();
                        $(`#switch-${this.activeGeoSource}`).prop("checked", false);
                        this.activeGeoSource = null
                    }
                    // Toggled on, add source
                    this.overlays[layerKey].show();
                    this.activeGeoSource = layerKey;
                }
            })
        }

        MarketEvaluatorOverlayManager._instance = this;
    }

    static getInstance(): MarketEvaluatorOverlayManager {
        if (MarketEvaluatorOverlayManager._instance) {
            return MarketEvaluatorOverlayManager._instance;
        }
        else {
            throw new Error('No Instance of MarketEvaluatorOverlayManager instantiated.');
        }
    }

    swap(
        lst: Array<string>,
        x: number,
        y: number,
    ) {
        const a = lst[x];
        lst[x] = lst[y];
        lst[y] = a;
    };

    populateOverlays() {
        const sourcePromises = [];
        for (const key in this.sources) {
            sourcePromises.push(this.populateSource(key));
        }
        Promise.all(sourcePromises).then(() => {
            this.overlays = {
                'rdof': new MapboxGeoOverlay(
                    this.map,
                    geoOverlays.rdof,
                    this.sources.rdof.sourceUrl,
                    this.sources.rdof.sourceLayer,
                    RdofOverlayPopup
                ),
                'communityConnect': new MapboxGeoOverlay(
                    this.map,
                    geoOverlays.communityConnect,
                    this.sources.communityConnect.sourceUrl,
                    this.sources.communityConnect.sourceLayer,
                    CommunityConnectOverlayPopup
                ),
                'cbrs': new MapboxGeoOverlay(
                    this.map,
                    geoOverlays.cbrs,
                    this.sources.cbrs.sourceUrl,
                    this.sources.cbrs.sourceLayer,
                    CbrsOverlayPopup
                ),
                'censusBlocks': new MapboxGeoOverlay(
                    this.map,
                    geoOverlays.censusBlocks,
                    this.sources.censusBlocks.sourceUrl,
                    this.sources.censusBlocks.sourceLayer,
                    CensusBlocksOverlayPopup
                ),
                'tribal': new MapboxGeoOverlay(
                    this.map,
                    geoOverlays.tribal,
                    this.sources.tribal.sourceUrl,
                    this.sources.tribal.sourceLayer,
                    TribalOverlayPopup
                )
            }
        })
    }

    populateSource(type: string) {
        return $.ajax({
            method: "GET",
            url: "/overlay/",
            data: { type },
        }).done((resp) => {
            // @ts-ignore
            this.sources[type] = resp;
        });
    }

    sortOverlayer() {
        const overlayerIds = new Set(overlay.layerIdPriority);
        const style = this.map.getStyle();
        const layers = style.layers ? style.layers : [];
        const layerIds = layers.map(({ id }) => id)
            .filter(id => overlayerIds.has(id));
        const init: accum = {
            'community-connect-overlay-fills': -1,
            'rdof2020-overlay-fills': -1,
            'tower-overlay-label': -1,
            'cbrs-overlay-fills': -1,
            'census-block-overlay-fills': -1,
            'tribal-overlay-fills': -1,
        };
        const convert = overlay.layerIdPriority.reduce(
            (accum: accum, id: string, ind: number): accum => ({
                ...accum,
                [id]: ind,
            }),
            init,
        );
        for (let i = 0; i < layerIds.length - 1; i++) {
            for (let j = i; j < layerIds.length - 1; j++) {
                // @ts-ignore
                if (convert[layerIds[i]] > convert[layerIds[i + 1]]) {
                    this.map.moveLayer(layerIds[i + 1], layerIds[i]);
                    this.swap(layerIds, i, i + 1);
                }
            }
        }
    };
}
