import * as MapboxGL from "mapbox-gl";
import { createGeoJSONCircle } from "./RadiusModeUtils.js";

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
                },
                id: feature.id,
            };
          this.draw.add(newCircle);
        }
    }
}

