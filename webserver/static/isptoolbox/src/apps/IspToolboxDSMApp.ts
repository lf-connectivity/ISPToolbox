import * as MapboxGL from "mapbox-gl";
import LidarAvailabilityLayer from '../availabilityOverlay';
import { getMapDefault } from '../utils/MapDefaults';
import type { MapDefault } from '../utils/MapDefaults';
import { LOSCheckMapboxStyles } from '../LOSCheckMapboxStyles';
import {dsmExportStyles } from '../isptoolbox-mapbox-draw/styles/dsm_export_styles';
//@ts-ignore
const mapboxgl = window.mapboxgl;
// @ts-ignore
const MapboxDraw = window.MapboxDraw;
// @ts-ignore
const MapboxGeocoder = window.MapboxGeocoder;

export default class DSMExportApp {
    map: MapboxGL.Map;
    draw: any;
    availability: LidarAvailabilityLayer;
    constructor(map_settings: MapDefault) {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/satellite-streets-v11', // stylesheet location
            center: map_settings.center, // starting position [lng, lat]
            zoom: map_settings.zoom, // starting zoom
        });
        // Create Draw
        this.map.on('load', () => {
            this.availability = new LidarAvailabilityLayer(this.map);
            var geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                placeholder: 'Search for an address'
            });
            document.getElementById('geocoder')?.appendChild(geocoder.onAdd(this.map));
            this.draw = new MapboxDraw({
                userProperties: true,
                displayControlsDefault: true,
                // @ts-ignore
                styles: LOSCheckMapboxStyles.concat(dsmExportStyles)
            }
            );
            this.map.addControl(this.draw, 'bottom-right');
            this.draw.changeMode('draw_polygon');
            this.map.on('draw.create', this.drawCreateCallback.bind(this));
        });

        $("#export-dsm-btn").on("click", this.exportButtonCallback.bind(this));
    }

    drawCreateCallback({ features }: { features: Array<any> }) {
    }

    exportButtonCallback() {
        const fc = this.draw.getSelected();
        const gc = { 'type': "GeometryCollection", "geometries": fc.features.map((f: any) => { return f.geometry }) };
        this.exportArea(gc);
        $("#dsm_export_instructions").addClass('d-none');
        $("#dsm_download_section").removeClass("d-none");
    }

    renderErrorMessage(error: string | null) {
        if (error === null) {
            $("#dsm_export_error").addClass("d-none");
        } else {
            $("#dsm_export_error").removeClass("d-none");
            $("#dsm_export_error").text(error);
        }
    }

    exportArea(polygon: any) {
        this.renderErrorMessage(null);
        // @ts-ignore
        const csrf = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        $.ajax({
            url: "/pro/workspace/api/dsm-export/",
            method: "POST",
            data: JSON.stringify(
                { aoi: polygon }
            ),
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': csrf
            }
        }).done((resp) => {
            if (resp.error) {
                this.renderErrorMessage(resp.error);
            } else {
                this.pollResult(resp.uuid, resp.access_token);
            }
        }).fail(
            () => { this.renderErrorMessage("Failed to create export") }
        );
    }

    pollResult(uuid: string, token: string) {
        const checkResult = (uuid: string, token: string) => {
            $.ajax({ url: `/pro/workspace/api/dsm-export/${uuid}/`, "method": "GET", headers: { 'Authorization': token } }).done((resp) => {
                switch (resp.status) {
                    case "SUCCESS":
                        this.setDownloadLink(resp.url);
                        $("#dsm_export_status").text(`status:${resp.status}`);
                        break;
                    case "FAILURE":
                        this.renderErrorMessage(resp.error);
                        $("#dsm_export_status").text(`status:${resp.status}`);
                        break;
                    default:
                        $("#dsm_export_status").text(`status:${resp.status}`);
                        setTimeout(() => { checkResult(uuid, token) }, 2500);
                        break;
                }
            });
        }
        checkResult(uuid, token);
    }

    setDownloadLink(url: null | string) {
        if (url) {
            $("#dsm_download_link").attr("href", url);
            $("#dsm_download_btn").removeAttr("disabled");
        }
    }
}
$(() => {
    const mapDefault = getMapDefault();
    // Create Map Object
    mapboxgl.accessToken = 'pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ';
    new DSMExportApp(mapDefault);
    // @ts-ignore
    $('#DSMExportModal').modal('show');
});