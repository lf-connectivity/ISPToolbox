import * as MapboxGL from "mapbox-gl";
import { createGeoJSONCircle } from "./isptoolbox-mapbox-draw/RadiusModeUtils.js";

const DEFAULT_AP_HEIGHT = 30;
export class AccessPointTool {
    map: MapboxGL.Map;
    draw: any;
    constructor(map: MapboxGL.Map, draw: any){
        this.map = map;
        this.draw = draw;
        // Initialize Constructors
        this.map.on('draw.create', this.drawCreateCallback.bind(this));
    }
    drawCreateCallback({features} : any) {
        const feature = features[0];
        if (feature.properties.radius) {
            const newCircle = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: createGeoJSONCircle(
                        feature.geometry.coordinates,
                        feature.properties.radius / 1000,
                    ).geometry.coordinates,
                },
                properties: {
                    isCircle: true,
                    radius: feature.properties.radius / 1000,
                    center: feature.geometry.coordinates,
                    height: DEFAULT_AP_HEIGHT,
                },
                id: feature.id,
            };
          const ids = this.draw.add(newCircle);
          ids.forEach((id : string) => {
            this.sendCoverageRequest(id);
          });
        }
    }
    sendCoverageRequest(id: string){
        const feat = this.draw.get(id);
        if(feat){
            $.ajax({url: "/pro/workspace/api/ap-los/", data: {
                center: feat.properties.center,
                radius: feat.properties.radius,
                height: feat.properties.height,
            }, success: this.sucessfulResponse.bind(this)});
        }
    }
    sucessfulResponse(response: any){
        console.log(response);
    }
}

