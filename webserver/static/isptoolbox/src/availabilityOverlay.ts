export function getAvailabilityOverlay(callback : (arg0: any) => void) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        // Typical action to be performed when the document is ready:
            var geojson = JSON.parse(xhttp.response);
            callback(geojson);
        }
    };
    xhttp.open("GET","https://static.isptoolbox.io/static/pt_clouds_overlay.geojson", true);
    xhttp.send();
}