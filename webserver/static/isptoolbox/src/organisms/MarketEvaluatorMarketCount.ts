// (c) Meta Platforms, Inc. and affiliates. Copyright
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { IMapboxDrawPlugin, initializeMapboxDrawInterface } from "../utils/IMapboxDrawPlugin";

export class MarketEvaluatorMarketCount implements IMapboxDrawPlugin{
    EMPTY_ID = "me--num_markets-empty";
    ALL_ID = "me--num_markets-all";
    SOME_ID = "me--num_markets-some";
    FRACTION_ID = "me--num_markets-fraction";

    constructor(private map: mapboxgl.Map, private draw: MapboxDraw)
    {
        initializeMapboxDrawInterface(this, map);
        this.drawSelectionChangeCallback(this.draw.getSelected());
    }

    noneSelected(){
        $(`#${this.ALL_ID}, #${this.SOME_ID}`).addClass('d-none');
        $(`#${this.EMPTY_ID}`).removeClass('d-none');
    }
    allSelected(){
        $(`#${this.EMPTY_ID}, #${this.SOME_ID}`).addClass('d-none');
        $(`#${this.ALL_ID}`).removeClass('d-none');
    }
    someSelected(fraction: string){
        $(`#${this.EMPTY_ID}, #${this.ALL_ID}`).addClass('d-none');
        $(`#${this.SOME_ID}`).removeClass('d-none');
        $(`#${this.FRACTION_ID}`).text(fraction);
    }

    private filterFeatures(f: GeoJSON.Feature){
        return f.geometry.type !== 'Point' && f.geometry.type !== 'LineString' && f.geometry.type !== 'MultiLineString' && f.geometry.type !== 'MultiPoint';
    }

    drawSelectionChangeCallback(event: {features: Array<GeoJSON.Feature>}){
        if(event.features.length === 0)
        {
            if(this.draw.getAll().features.filter(f => this.filterFeatures(f)).length > 0)
            {
                this.allSelected();
            } else {
                this.noneSelected();
            }
        } else {
            const number_selected = event.features.length;
            const total_number = this.draw.getAll().features.filter(f => this.filterFeatures(f)).length;
            if(number_selected === total_number)
            {
                this.allSelected();
            } else {
                this.someSelected(`${number_selected} / ${total_number}`);
            }
        }
    }

    drawDeleteCallback(event: {features: Array<GeoJSON.Feature>})
    {
        if(this.draw.getAll().features.filter(f => this.filterFeatures(f)).length > 0)
        {
            this.allSelected();
        } else {
            this.noneSelected();
        }
    }
}