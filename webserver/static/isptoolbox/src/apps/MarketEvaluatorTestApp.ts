$(document).ready(function() {
    const sample_websocket = new WebSocket("ws://localhost:8000/ws/market-evaluator/");
    
    sample_websocket.onopen = (event: Event) => {
        send_example_request();
    }
    sample_websocket.onmessage = (event: MessageEvent) => {
        const response = (JSON.parse(event.data) as MarketEvaluatorEvent);
        console.log(response);
        handle_event(response);
    }
    
    let num_buildings = 0;
    
    type MarketEvaluatorEvent =  BuildingEvent | AreaEvent | IncomeEvent | SpeedsEvent | ProvidersEvent | BroadbandNowEvent;
    
    type BuildingEvent = {
        type: 'building.overlays';
        value: {
            gc: {
                geometries: Array<{}>
            }
        }
    }
    type AreaEvent = {
        type: 'polygon.area';
        value: string;
    }
    
    type IncomeEvent = {
        type: 'median.income';
        value: {
            averageMedianIncome: number,
        }
    }
    type SpeedsEvent = {
        type: 'median.speeds';
        value: Array<{
            Zipcode: string,
            "Download (Mbit/s)": string,
            "Upload (Mbit/s)": string,
            pct_area : string
        }>;
    }
    
    type ProvidersEvent = {
        type: 'service.providers';
        value: {
            error: number;
            competitors: Array<string>;
            down_ad_speed: Array<number>;
            up_ad_speed: Array<number>,
            tech_used: Array<Array<number>>
        }
    }
    
    type BroadbandNowEvent = {
        type: 'broadband.now';
        value: {
            bbnPriceRange: [string, string]
        }
    }
    
    
    const send_example_request = () => {
        num_buildings = 0;
        sample_websocket.send(JSON.stringify(request_json));
    }
    
    function averageMedianSpeeds(resp : SpeedsEvent){
        let speeds = [0, 0];
        resp.value.forEach(v => {
            speeds[0] += parseFloat(v.pct_area) * parseFloat(v["Download (Mbit/s)"]);
            speeds[1] += parseFloat(v.pct_area) * parseFloat(v["Upload (Mbit/s)"]);
        });
        return speeds;
    }
    
    const handle_event = (meResponse: MarketEvaluatorEvent) => {
        switch(meResponse.type) {
            case('polygon.area'):
                $(`#${meResponse.type.replace('.','_')}`).text(meResponse.value);
                break;
    
            case('median.income'):
                $(`#${meResponse.type.replace('.','_')}`).text(meResponse.value.averageMedianIncome);
                break;
            
            case('broadband.now'):
                $(`#${meResponse.type.replace('.','_')}`).text(JSON.stringify(meResponse.value.bbnPriceRange));
                break;
    
            case('median.speeds'):
                $(`#${meResponse.type.replace('.','_')}`).text(JSON.stringify(averageMedianSpeeds(meResponse)));
                break;
    
            case('service.providers'):
                $(`#${meResponse.type.replace('.','_')}`).text(meResponse.value.competitors.length);
                break;
    
            case('building.overlays'):
                num_buildings += meResponse.value.gc.geometries.length
                $(`#${meResponse.type.replace('.','_')}`).text(num_buildings);
                break;
        }
    }
    
    
    const request_json = {
        "request_type": "standard_polygon",
        "include": {
            "coordinates": [
                [
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
                ]
            ],
            "type": "Polygon"
        },
        "uuid": "5ee3e557-a3a2-4f08-bd87-a4952e354c63"
    };
    });