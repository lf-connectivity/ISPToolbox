export enum WorkspaceEvents {
    LOS_MODAL_OPENED = 'los.modal_opened',
    APS_LOADED = 'ap.all_loaded',
    AP_DELETED = 'ap.deleted',
    AP_UPDATE = 'ap.update',
    AP_RENDER = 'ap.render',
    AP_SELECTED = 'ap.selected',
}

export enum WorkspaceFeatureTypes {
    AP = 'access_point',
    CPE = 'cpe',
    AP_CPE_LINK = 'ap_cpe_link'
}