// (c) Meta Platforms, Inc. and affiliates. Copyright
import PubSub from "pubsub-js";

export enum CRUDEvent {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete'
}

export interface IIspToolboxAjaxPlugin {
    createCallback?(event: { features: Array<GeoJSON.Feature> }): void;
    readCallback?(event: { features: Array<GeoJSON.Feature> }): void;
    updateCallback?(event: { features: Array<GeoJSON.Feature> }): void;
    deleteCallback?(event: { features: Array<GeoJSON.Feature> }): void;
}

export function initializeIspToolboxInterface(interfaceInit: IIspToolboxAjaxPlugin): Array<string | null> {
    const subscriptions = [];
    if (interfaceInit.createCallback)
        subscriptions.push(PubSub.subscribe(CRUDEvent.CREATE, (_: string, e: { features: Array<GeoJSON.Feature> }) => { if (interfaceInit.createCallback) interfaceInit.createCallback(e) }));
    if (interfaceInit.readCallback)
        subscriptions.push(PubSub.subscribe(CRUDEvent.READ, (_: string, e: { features: Array<GeoJSON.Feature> }) => { if (interfaceInit.readCallback) interfaceInit.readCallback(e) }));
    if (interfaceInit.updateCallback)
        subscriptions.push(PubSub.subscribe(CRUDEvent.UPDATE, (_: string, e: { features: Array<GeoJSON.Feature> }) => { if (interfaceInit.updateCallback) interfaceInit.updateCallback(e) }));
    if (interfaceInit.deleteCallback)
        subscriptions.push(PubSub.subscribe(CRUDEvent.DELETE, (_: string, e: { features: Array<GeoJSON.Feature> }) => { if (interfaceInit.deleteCallback) interfaceInit.deleteCallback(e) }));
    return subscriptions;
}

export function deactivateIspToolboxInterface(subscriptions: Array<string | null>) {
    subscriptions.forEach(s => {
        if (s !== null) {
            PubSub.unsubscribe(s);
        }
    });
}
