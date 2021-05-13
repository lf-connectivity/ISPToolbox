import mapboxgl, * as MapboxGL from "mapbox-gl";
import { isBeta } from "../LinkCheckUtils";
import { LinkCheckBasePopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckBasePopup";
import { LinkCheckCustomerConnectPopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckCustomerConnectPopup";
import { LinkCheckDrawPtPPopup } from "../isptoolbox-mapbox-draw/popups/LinkCheckDrawPtPPopup";
import { MapboxSDKClient } from "../MapboxSDKClient";
import { ClickableMarker } from "../molecules/ClickableMarker";
import { BaseWorkspaceFeature } from "../workspace/BaseWorkspaceFeature";
import { WorkspaceFeatureTypes } from "../workspace/WorkspaceConstants";
import { AccessPoint } from "../workspace/WorkspaceFeatures";
import { WorkspaceManager } from "../workspace/WorkspaceManager";

export class LinkCheckLocationSearchTool {
    private map: mapboxgl.Map;
    private marker: ClickableMarker;
    private workspaceManager: WorkspaceManager;
    private geocoder: any;
    private reverseGeocodeResponse: any;
    private isPopupOpen: boolean;

    constructor(map: mapboxgl.Map, workspaceManager: WorkspaceManager, geocoder: any) {
        this.workspaceManager = workspaceManager;
        this.marker = new ClickableMarker({
            draggable: true,
            color: '#28F2BF'
        });
        this.isPopupOpen = false;
        this.map = map;
        this.geocoder = geocoder;

        if (isBeta()) {
            this.geocoder.on('result', ({result}: any) => {
                this.setLngLat(result.center);
                this.show();
            });
        }
        
        // Clicking on point -> show popup on desktop
        this.marker.onClick((e: any) => {
            if (e.originalEvent.button == 0) {
                this.showPopup();
            }
        });

        this.marker.on('dragstart', () => {
            // have to do this so that after popup cleanup function we still remember if it was open or not
            if (this.isPopupOpen) {
                LinkCheckDrawPtPPopup.getInstance().hide();
                LinkCheckCustomerConnectPopup.getInstance().hide();
                this.isPopupOpen = true;
            }
        });

        this.marker.on('dragend', () => {
            this.onLocationChange(() => {
                if (this.isPopupOpen) {
                    this.showPopup();
                }
            });
        });
    }

    onPopupClose() {
        this.isPopupOpen = false;
    }

    show() {
        this.marker.addTo(this.map);
    }

    hide() {
        if (this.isPopupOpen) {
            this.marker.remove();
            this.geocoder.clear();
        }
    }

    setLngLat(lngLatInput: any) {
        this.marker.setLngLat(lngLatInput);
        this.onLocationChange();
    }

    private onLocationChange(followup?: (response: any) => void) {
        let mapboxClient = MapboxSDKClient.getInstance();
        let lngLat = [this.marker.getLngLat().lng, this.marker.getLngLat().lat];
        mapboxClient.reverseGeocode(lngLat, (response: any) => {
            let result = response.body.features;
            this.geocoder.setInput(result[0].place_name);
            this.reverseGeocodeResponse = response;

            if (followup) {
                followup(response);
            }
        });
    }

    private showPopup() {
        let lngLat: [number, number] = [this.marker.getLngLat().lng, this.marker.getLngLat().lat];

        // See if it's accessible by any access points, then set a negative building ID to set status to unknown.
        let accessPoints = Object.values(this.workspaceManager.features).filter((feature: BaseWorkspaceFeature) =>
            feature.getFeatureType() === WorkspaceFeatureTypes.AP
        ) as AccessPoint[];
        let apPopup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(
            LinkCheckCustomerConnectPopup, lngLat, this.reverseGeocodeResponse) as LinkCheckCustomerConnectPopup;
        apPopup.setAccessPoints(accessPoints);
        apPopup.setBuildingId(-1);

        if (apPopup.getAccessPoints().length) {
            apPopup.show();
        }
        else {
            let popup = LinkCheckBasePopup.createPopupFromReverseGeocodeResponse(LinkCheckDrawPtPPopup, lngLat, this.reverseGeocodeResponse);
            popup.show();
        }
        this.isPopupOpen = true;
    }
}