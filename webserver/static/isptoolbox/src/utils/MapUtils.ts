export function getPolygonCentroid(arr: [[lat: number, lng: number]]) {
    var x = arr.map((el) => el[0]);
    var y = arr.map((el) => el[1]);
    var cx = (Math.min(...x) + Math.max(...x)) / 2;
    var cy = (Math.min(...y) + Math.max(...y)) / 2;
    return [cx, cy];
}
