import MarketEvaluatorWS, {MedianSpeedResponse, MarketEvalWSEvents, MedianIncomeResponse, BroadbandNowResponse, ServiceProvidersResponse, BuildingOverlaysResponse} from '../MarketEvaluatorWS';
import PubSub from 'pubsub-js';
import { over } from 'lodash';
$(document).ready(function () {

    let num_buildings = 0;

    const send_example_request = () => {
        num_buildings = 0;
        ws.sendPolygonRequest(request_area);
    };

    function averageMedianSpeeds(resp: MedianSpeedResponse) {
        let speeds = [0, 0];
        resp.forEach(v => {
            speeds[0] += parseFloat(v.pct_area) * parseFloat(v["Download (Mbit/s)"]);
            speeds[1] += parseFloat(v.pct_area) * parseFloat(v["Upload (Mbit/s)"]);
        });
        return speeds;
    }

    const handle_poly_area = (msg: string, polyArea: number) => {
        console.log(polyArea);
        $(`#polygon_area`).text(polyArea);
    }

    const handle_median_income = (msg: string, medianIncome: MedianIncomeResponse) => {
        console.log(medianIncome);
        $(`#median_income`).text(medianIncome.averageMedianIncome);
    }

    const handle_bbn = (msg: string, bbn: BroadbandNowResponse) => {
        console.log(bbn);
        $(`#broadband_now`).text(JSON.stringify(bbn.bbnPriceRange));
    }

    const handle_median_speeds = (msg: string, medianSpeeds: MedianSpeedResponse) => {
        console.log(medianSpeeds);
        $(`#median_speeds`).text(JSON.stringify(averageMedianSpeeds(medianSpeeds)));
    }

    const handle_service_providers = (msg: string, serviceProviders: ServiceProvidersResponse) => {
        console.log(serviceProviders);
        $(`#service_providers`).text(serviceProviders.competitors.length);
    }

    const handle_building_overlays = (msg: string, overlays: BuildingOverlaysResponse) => {
        console.log(overlays);
        num_buildings += overlays.gc.geometries.length;
        $(`#building_overlays`).text(num_buildings);
    }

    const ws = new MarketEvaluatorWS([]);

    // Subscriptions
    PubSub.subscribe(MarketEvalWSEvents.MKT_EVAL_WS_CONNECTED, send_example_request);
    PubSub.subscribe(MarketEvalWSEvents.POLY_AREA_MSG, handle_poly_area);
    PubSub.subscribe(MarketEvalWSEvents.INCOME_MSG, handle_median_income);
    PubSub.subscribe(MarketEvalWSEvents.BROADBAND_NOW_MSG, handle_bbn);
    PubSub.subscribe(MarketEvalWSEvents.SPEEDS_MSG, handle_median_speeds);
    PubSub.subscribe(MarketEvalWSEvents.SERVICE_PROV_MSG, handle_service_providers);
    PubSub.subscribe(MarketEvalWSEvents.BUILDING_OVERLAYS_MSG, handle_building_overlays);

    const request_area: GeoJSON.FeatureCollection = {
        "features": [{
            "geometry": {
                "coordinates": [[
                    [
                        -122.20547665022926,
                        37.46172253164244
                    ],
                    [
                        -122.18532708489278,
                        37.461337135077855
                    ],
                    [
                        -122.19819367480616,
                        37.44996704289551
                    ],
                    [
                        -122.20547665022926,
                        37.46172253164244
                    ]
                ]],
                "type": "Polygon",
            },
            "type": "Feature",
            "properties": null,
        }],
        "type": "FeatureCollection"
    };
});