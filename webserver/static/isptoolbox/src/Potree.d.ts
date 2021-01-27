
export namespace Potree {

export class Annotation {
    constructor(options: {
        position : [number, number, number],
        title : string
    })
}
export class Viewer{}
export class CameraAnimation{
    constructor(viewer: Viewer)
}
export class BoxVolume{}

    // Enums for Point Cloud Rendering Properties
    const PointShape: any;
    const PointSizeType: any;

    function loadPointCloud(url: string, arg1: string, arg2: (e: any) => void) : void;
    let numNodesLoadingValue: number;
}