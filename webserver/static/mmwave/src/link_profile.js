export function createLinkChart(link_chart, highLightPointOnGround, moveLocation3DView) {
   return Highcharts.chart('link_chart', {
        chart: {
            backgroundColor: "#C2D8EC",
            plotBackgroundColor: "#FFFFFF",
            type: 'line',
            style: {"fontFamily": "'Basis Grotesque Pro Mono', 'SFMono-Regular', 'Liberation Mono', Courier, monospace","fontSize":"12px"}
        },
        legend: {
            enabled: false
        },
        title: {
            text: undefined
        },
        xAxis: {
            allowDecimals: false,
            labels: {
                formatter: function () {
                    return this.value; // clean, unformatted number for year
                }
            },
            accessibility: {
                rangeDescription: 'Distance'
            }
        },
        yAxis: {
            title: {
                text: 'Elevation [m]'
            },
            labels: {
                formatter: function () {
                    return this.value  + '[m]';
                }
            }
        },
        xAxis: {
            title: {
                text: 'Distance'
            },
            labels: {
                formatter: function () {
                    return this.value  + '[m]';
                }
            }
        },
        series: [
        {
            name: 'Terrain',
            data: [],
            zIndex: 1,
            color: '#687A8A',
            type: 'area'
        },
        {
            name: 'LiDAR',
            data: [],
            zIndex: 0,
            color: '#C4CCD2',
            type: 'area'

        }, {
            name: 'LOS',
            data: [],
            zIndex: 2,
            color: '#5692D1'
        }, {
            name: 'Fresnel',
            data: [],
            type: 'arearange',
            lineWidth: 0,
            linkedTo: ':previous',
            color: "#28F4C6",
            fillOpacity: 0.3,
            zIndex: -1,
            marker: {
                enabled: false
            }
        }],
        plotOptions: {
            series: {
                point: {
                  events: {
                    mouseOver: _.debounce( (e) => {
                      const point = { x: e.target.x, y: e.target.y };
                      highLightPointOnGround(point);
                      moveLocation3DView(point);
                    }, 100, {
                        'leading': true,
                        'trailing': true,
                      })
                  }
                },
                states: {
                    inactive: {
                      opacity: 1
                    }
                }
            }
        },
        credits: {
            enabled: false
        },
        tooltip: { enabled: false }
    });
};