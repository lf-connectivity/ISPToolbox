export enum WorkspaceEvents {
    LOS_MODAL_OPENED = 'los.modal_opened',
    APS_LOADED = 'ap.all_loaded',
    AP_DELETED = 'ap.deleted',
    AP_UPDATE = 'ap.update',
    AP_RENDER_SELECTED = 'ap.render',
    AP_RENDER_GIVEN = 'ap.render_given',
    AP_SELECTED = 'ap.selected',
    AP_COVERAGE_UPDATED = 'ap.coverage_updated'
}

export enum WorkspaceFeatureTypes {
    AP = 'access_point',
    CPE = 'cpe',
    AP_CPE_LINK = 'ap_cpe_link'
}