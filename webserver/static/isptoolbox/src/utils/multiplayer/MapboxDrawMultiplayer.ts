import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { MultiplayerConnection } from "./MultiplayerConnection";
import AutoMerge from 'automerge';
import { MultiplayerEvents } from "./MultiplayerEvents";
import PubSub from 'pubsub-js';

export default class MapboxDrawMultiplayer {
    doc: AutoMerge.FreezeObject<any>;
    constructor(
        private map: mapboxgl.Map,
        private draw: MapboxDraw,
        private connection: MultiplayerConnection,
        private initialDrawFeatures : any,
    ){
        this.doc = AutoMerge.from({type: "FeatureCollection", features: []});
        this.initializeCallbacks();
    }

    initializeCallbacks(){
        this.map.on('draw.create', this.drawCreateCallback.bind(this));
        this.map.on('draw.update', this.drawUpdateCallback.bind(this));
        this.map.on('draw.delete', this.drawDeleteCallback.bind(this));
        // TODO: achong add callback for when feature property is changed
        PubSub.subscribe('initautomergemap', this.initializeAutoMergeMap.bind(this));
        PubSub.subscribe(MultiplayerEvents.DRAW_EDIT, this.receiveDrawEditCallback.bind(this));
    }

    initializeAutoMergeMap(msg: string, data : any){
        this.doc = AutoMerge.load(data.map);
        this.draw.deleteAll();
        this.draw.add(this.doc as GeoJSON.FeatureCollection);
    }

    drawCreateCallback({features} : {features : Array<GeoJSON.Feature>}) {
        const newDoc = AutoMerge.change(this.doc, (doc) => {
            features.forEach((new_feat) => {
                doc.features.push(new_feat);
            })
        });
        const changes = AutoMerge.getChanges(this.doc, newDoc);
        this.connection.send(
            {
                type: MultiplayerEvents.DRAW_EDIT,
                edit: JSON.stringify(changes)
            }
        );
        this.doc = newDoc;
    }

    drawUpdateCallback({features, action} : {features: Array<GeoJSON.Feature>, action: string }) {
        const newDoc = AutoMerge.change(this.doc, (doc) => {
            features.forEach((feat) => {
                const idx = doc.features.findIndex((f :any) => f.id === feat.id);
                doc.features.deleteAt(idx);
            });
            features.forEach((feat) => {
                doc.features.push(feat);
            })
        });
        const changes = AutoMerge.getChanges(this.doc, newDoc);
        this.connection.send({
            type: MultiplayerEvents.DRAW_EDIT,
            edit: JSON.stringify(changes)
        });
        this.doc = newDoc;
    }

    drawDeleteCallback({features} : {features : Array<GeoJSON.Feature>}) {
        const newDoc = AutoMerge.change(this.doc, (doc) => {
            features.forEach((feat) => {
                const idx = doc.features.findIndex((f :any) => f.id === feat.id);
                doc.features.deleteAt(idx);
            });
        });
        const changes = AutoMerge.getChanges(this.doc, newDoc);
        this.connection.send({
            type: MultiplayerEvents.DRAW_EDIT,
            edit: JSON.stringify(changes)
        });
        this.doc = newDoc;
    }

    receiveDrawEditCallback(msg: string, data: any){
        const changes = JSON.parse(data.edit);
        const newDoc = AutoMerge.applyChanges(this.doc, changes);
        this.doc = newDoc;
        this.draw.deleteAll();
        this.draw.add(this.doc as GeoJSON.FeatureCollection);
    }

}