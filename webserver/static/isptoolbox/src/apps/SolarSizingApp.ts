import * as SolarUtils from '../utils/SolarUtils';
class SolarFluxGraph {
    constructor() {
        //@ts-ignore
        window.Highcharts.chart('solar-flux-graph', {
            title: {
                text: 'Best and Worst Month Average Solar Flux'
            },

            // subtitle: {
            //   text: 'Source: thesolarfoundation.com'
            // },

            yAxis: {
                title: {
                    text: 'kW / m^2'
                }
            },

            xAxis: {
                accessibility: {
                    rangeDescription: 'Time of Day'
                }
            },
            // legend: {
            //   layout: 'vertical',
            //   align: 'right',
            //   verticalAlign: 'middle'
            // },
            plotOptions: {
                series: {
                    label: {
                        connectorAllowed: false
                    },
                    pointStart: 2010
                }
            },
            series: [
                {
                    name: 'Summer Solstice',
                    data: [43934, 52503, 57177, 69658, 97031, 119931, 137133, 154175]
                },
                {
                    name: 'Winter Solstice',
                    data: [24916, 24064, 29742, 29851, 32490, 30282, 38121, 40434]
                }
            ],

            responsive: {
                rules: [
                    {
                        condition: {
                            maxWidth: 500
                        },
                        chartOptions: {
                            // legend: {
                            //   layout: 'horizontal',
                            //   align: 'center',
                            //   verticalAlign: 'bottom'
                            // }
                        }
                    }
                ]
            },
            credits: false
        });
    }

    updateLocation(location: GeoJSON.Point) {
        console.log('update location');
        console.dir(location);
        const hours = SolarUtils.number_solar_hours(location.coordinates[1], 0);
        console.log(hours);
    }
}

$(() => {
    const graph = new SolarFluxGraph();
    //@ts-ignore
    window.mapboxgl.accessToken = window.mapbox_access_token;
    const map = new window.mapboxgl.Map({
        container: 'map',
        center: [-118.2628109, 34.717866],
        zoom: 15,
        style: 'mapbox://styles/mapbox/satellite-streets-v11' // stylesheet location
    });
    map.on('load', () => {
        const draw = new window.MapboxDraw({
            userProperties: true,
            displayControlsDefault: false,
            controls: {
                point: true
            }
        });

        map.addControl(draw, 'bottom-right');
        map.on('draw.selectionchange', ({ features }) => {
            if (features.length === 1) {
                graph.updateLocation(features[0].geometry);
            }
        });

        draw.add({
            id: '',
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-118.2628109, 34.717866]
            },
            properties: {}
        });
        map.addControl(
            //@ts-ignore
            new window.MapboxGeocoder({
                accessToken: window.mapboxgl.accessToken,
                mapboxgl: window.mapboxgl
            }),
            'top-left'
        );
    });
});
