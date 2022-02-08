import { BaseWorkspaceFeature } from "../workspace/BaseWorkspaceFeature";

export enum CRUDEvent {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete'
}

export interface IIspToolboxAjaxPlugin {
    createCallback? (event: {features: Array<GeoJSON.Feature>}): void;
    readCallback? (event: {features: Array<GeoJSON.Feature>}): void;
    updateCallback? (event: {features: Array<GeoJSON.Feature>}): void;
    deleteCallback? (event: {features: Array<GeoJSON.Feature>}): void;
}

export function initializeIspToolboxInterface(interfaceInit: IIspToolboxAjaxPlugin){
    interfaceInit.createCallback ? BaseWorkspaceFeature.subscribe(CRUDEvent.CREATE, interfaceInit.createCallback.bind(interfaceInit)) : null;
    interfaceInit.readCallback ? BaseWorkspaceFeature.subscribe(CRUDEvent.READ, interfaceInit.readCallback.bind(interfaceInit)) : null;
    interfaceInit.updateCallback ? BaseWorkspaceFeature.subscribe(CRUDEvent.UPDATE, interfaceInit.updateCallback.bind(interfaceInit)) : null;
    interfaceInit.deleteCallback ? BaseWorkspaceFeature.subscribe(CRUDEvent.DELETE, interfaceInit.deleteCallback.bind(interfaceInit)) : null;
}

export function deactivateIspToolboxInterface(interfaceRemove: IIspToolboxAjaxPlugin){
    interfaceRemove.createCallback ? BaseWorkspaceFeature.unsubscribe(CRUDEvent.CREATE, interfaceRemove.createCallback.bind(interfaceRemove)) : null;
    interfaceRemove.readCallback ? BaseWorkspaceFeature.unsubscribe(CRUDEvent.READ, interfaceRemove.readCallback.bind(interfaceRemove)) : null;
    interfaceRemove.updateCallback ? BaseWorkspaceFeature.unsubscribe(CRUDEvent.UPDATE, interfaceRemove.updateCallback.bind(interfaceRemove)) : null;
    interfaceRemove.deleteCallback ? BaseWorkspaceFeature.unsubscribe(CRUDEvent.DELETE, interfaceRemove.deleteCallback.bind(interfaceRemove)) : null;
}