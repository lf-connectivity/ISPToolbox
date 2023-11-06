// (c) Meta Platforms, Inc. and affiliates. Copyright
export type MapDefault = {
    center: [number, number];
    zoom: number;
};

export function getMapDefault(): MapDefault {
    const mapdefaultelem = document.getElementById('isp-map-default');
    return mapdefaultelem
        ? JSON.parse(mapdefaultelem.textContent ? mapdefaultelem.textContent : '')
        : null;
}

export function getInitialFeatures() {
    const mapdefaultelem = document.getElementById('isp-map-features');
    return mapdefaultelem
        ? JSON.parse(mapdefaultelem.textContent ? mapdefaultelem.textContent : '')
        : null;
}
