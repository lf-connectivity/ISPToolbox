var link_chart = null;

$(document).ready( function () {
    link_chart = Highcharts.chart('link_chart', {
        chart: {
            type: 'line'
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
                text: 'Above Earth Contour'
            },
            labels: {
                formatter: function () {
                    return this.value  + '[m]';
                }
            }
        },
        series: [
        {
            name: 'Terain',
            data: [],
            zIndex: 0,
            color: '#874280'
        },
        {
            name: 'LIDAR',
            data: [],
            zIndex: 1,
            color: '#675b45'
        }, {
            name: 'fresnel',
            data: [],
            zIndex: 2,
            color: '#00f7ca'
        }
        ],
        plotOptions: {
            series: {
                point: {
                  events: {
                    mouseOver: _.debounce( (e) => {
                      const point = { x: e.target.x, y: e.target.y };
                      highLightPointOnGround(point)
                    }, 100, {
                        'leading': true,
                        'trailing': true,
                      })
                  }
                }
            }
        },
        credits: {
            enabled: false
        },
        tooltip: { enabled: false },
    });
});