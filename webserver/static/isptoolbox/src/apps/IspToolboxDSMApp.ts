import * as MapboxGL from 'mapbox-gl';
import LidarAvailabilityLayer from '../availabilityOverlay';
import { getMapDefault } from '../utils/MapDefaults';
import type { MapDefault } from '../utils/MapDefaults';
import { WorkspaceMapboxStyles } from '../isptoolbox-mapbox-draw/styles/WorkspaceMapboxStyles';
import { combineStyles } from '../isptoolbox-mapbox-draw/index';
import PubSub from 'pubsub-js';
//@ts-ignore
import styles from '@mapbox/mapbox-gl-draw/src/lib/theme';
import { dsmExportStyles } from '../isptoolbox-mapbox-draw/styles/dsm_export_styles';
//@ts-ignore
const mapboxgl = window.mapboxgl;
// @ts-ignore
const MapboxDraw = window.MapboxDraw;
// @ts-ignore
const MapboxGeocoder = window.MapboxGeocoder;

enum DSMExportEvents {
    UPLOADED = 'dsm.uploadComplete'
}

export default class DSMExportApp {
    map: MapboxGL.Map;
    draw: any;
    availability: LidarAvailabilityLayer;
    uploadform: DSMUploadAOIForm;
    constructor(map_settings: MapDefault) {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: map_settings.center, // starting position [lng, lat]
            zoom: map_settings.zoom // starting zoom
        });
        // Create Draw
        this.map.on('load', () => {
            this.availability = new LidarAvailabilityLayer(this.map);
            var geocoder = new MapboxGeocoder({
                flyTo: false,
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                placeholder: 'Search for an address'
            });
            // Teleport User to Location
            geocoder.on('result', (e: any) => {
                const result = e.result;
                this.map.setCenter(result.center);
            });
            document.getElementById('geocoder')?.appendChild(geocoder.onAdd(this.map));
            this.draw = new MapboxDraw({
                userProperties: true,
                displayControlsDefault: true,
                // @ts-ignore
                styles: combineStyles(combineStyles(styles, WorkspaceMapboxStyles), dsmExportStyles)
            });
            this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
            this.map.addControl(this.draw, 'bottom-right');
            this.draw.changeMode('draw_polygon');
            this.map.on('draw.create', this.drawCreateCallback.bind(this));
            this.map.on('draw.modechange', this.drawChangeModeCallback.bind(this));
        });
        this.uploadform = new DSMUploadAOIForm('#dsm_upload_form');
        PubSub.subscribe(DSMExportEvents.UPLOADED, this.uploadReceived.bind(this));
        $('#draw-polygon-button').on('click', () => {
            this.draw.changeMode('draw_polygon');
            this.map.fire('draw.modechange', { mode: 'draw_polygon' });
        });
        $('#export-dsm-btn').on('click', this.exportButtonCallback.bind(this));
    }

    drawChangeModeCallback({ mode }: { mode: string }) {
        if (mode === 'draw_polygon') {
            $('#draw-polygon-button').addClass('btn-primary').removeClass('btn-secondary');
        } else {
            $('#draw-polygon-button').removeClass('btn-primary').addClass('btn-secondary');
        }
    }

    drawCreateCallback({ features }: { features: Array<any> }) {}

    exportButtonCallback() {
        this.setDownloadLink(null);
        const fc = this.draw.getSelected();
        const gc = {
            type: 'GeometryCollection',
            geometries: fc.features.map((f: any) => {
                return f.geometry;
            })
        };
        this.exportArea(gc);
    }

    renderErrorMessage(error: string | null) {
        if (error === null) {
            $('#dsm_export_error').addClass('d-none');
        } else {
            //@ts-ignore
            $('#dsm_export_error').removeClass('d-none');
            $('#dsm_export_status').text('');
            $('#dsm_export_error').text(error);
        }
    }

    exportArea(polygon: any) {
        this.renderErrorMessage(null);
        // @ts-ignore
        const csrf = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        $.ajax({
            url: '/pro/workspace/api/dsm-export/',
            method: 'POST',
            data: JSON.stringify({ aoi: polygon }),
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrf
            }
        })
            .done((resp) => {
                PubSub.publish(DSMExportEvents.UPLOADED, resp);
            })
            .fail(() => {
                this.renderErrorMessage('Failed to create export');
            });
    }

    uploadReceived(msg: string, resp: any) {
        $('#dsm_export_instructions').addClass('d-none');
        $('#dsm_download_section').removeClass('d-none');
        //@ts-ignore
        $('#DSMExportModal').modal('show');
        if (resp.error) {
            this.renderErrorMessage(resp.error);
        } else {
            this.pollResult(resp.uuid, resp.access_token);
        }
    }

    pollResult(uuid: string, token: string) {
        const checkResult = (uuid: string, token: string) => {
            $.ajax({
                url: `/pro/workspace/api/dsm-export/${uuid}/`,
                method: 'GET',
                headers: { Authorization: token }
            }).done((resp) => {
                switch (resp.status) {
                    case 'SUCCESS':
                        this.setDownloadLink(resp.url);
                        $('#dsm_export_status').text(`status:${resp.status}`);
                        $('#dsm-export-status-details').text('');
                        break;
                    case 'FAILURE':
                        this.renderErrorMessage(resp.error);
                        $('#dsm_export_status').text(`status:${resp.status}`);
                        $('#dsm-export-status-details').text(resp.error);
                        break;
                    default:
                        $('#dsm_export_status').text(`status:${resp.status}`);
                        $('#dsm-export-status-details').text(
                            `${resp.error ? '- ' + resp.error : ''}`
                        );
                        setTimeout(() => {
                            checkResult(uuid, token);
                        }, 2500);
                        break;
                }
            });
        };
        checkResult(uuid, token);
    }

    setDownloadLink(url: null | string) {
        if (url) {
            $('#dsm_download_link').attr('href', url);
            $('#dsm_download_btn').prop('disabled', false);
        } else {
            $('#dsm_download_link').removeAttr('href');
            $('#dsm_download_btn').prop('disabled', true);
        }
    }
}

/**
 * This javascript helps ajaxify the upload requests
 */
class DSMUploadAOIForm {
    selector: string;
    constructor(selector: string) {
        this.selector = selector;
        $(this.selector).on('submit', this.formSubmitCallback.bind(this));
    }

    formSubmitCallback(event: any) {
        const form = $(this.selector)[0] as HTMLFormElement;
        event.preventDefault();
        const data = new FormData();
        $(this.selector + ' input[type=file]').each((idx, elem) => {
            const element = elem as HTMLInputElement;
            const name = element.getAttribute('name');
            const files = element.files;
            if (files && name) {
                data.append(name, files[0]);
            }
        });
        const url = form.getAttribute('action');
        const method = form.getAttribute('method');
        if (method && url) {
            const csrf =
                // @ts-ignore
                document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            $.ajax({
                url,
                method,
                data,
                contentType: false,
                processData: false,
                headers: {
                    'X-CSRFToken': csrf
                }
            }).done(function (data) {
                // @ts-ignore
                $('#DSMUpload').modal('hide');
                PubSub.publish(DSMExportEvents.UPLOADED, data);
            });
        }
    }
}

$(() => {
    // @ts-ignore
    $('#DSMExportModal').modal('show');
    const mapDefault = getMapDefault();
    // Create Map Object
    mapboxgl.accessToken =
        'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';
    new DSMExportApp(mapDefault);
});
