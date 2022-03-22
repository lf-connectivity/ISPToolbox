export enum ISPToolboxTool {
    MARKET_EVAL = 'market_evaluator',
    LOS_CHECK = 'los_check'
}

export enum WorkspaceEvents {
    AP_RENDER_GIVEN = 'ap.render_given',
    AP_COVERAGE_UPDATED = 'ap.coverage_updated',
    NO_ITEMS = 'workspace.no_items',
    CLOUDRF_COVERAGE_UPDATED = 'cloudrf.coverage_updated',
    AP_LAYER_CLICKED = 'ap_layer.clicked',
    CPE_LAYER_CLICKED = 'cpe_layer.clicked',
    SECTOR_LAYER_CLICKED = 'sector_layer.clicked',
    DRAGGING_FEATURES = 'dragging_features'
}

export enum ASREvents {
    PLOT_LIDAR_COVERAGE = 'asr.lidar_coverage',
    SAVE_ASR_TOWER = 'asr.save_tower'
}

export enum ASRLoadingState {
    STANDBY = 'asr_tooltip.standby',
    LOADING_COVERAGE = 'asr_tooltip.loading',
    LOADED_COVERAGE = 'asr_tooltip.loaded'
}

export enum WorkspaceFeatureTypes {
    AP = 'access_point',
    SECTOR = 'sector',
    CPE = 'cpe',
    AP_CPE_LINK = 'ap_cpe_link',
    COVERAGE_AREA = 'coverage_area',
    PTP_LINK = 'ptp_link'
}

export enum SectorMapboxDrawState {
    DEFAULT = 'default',
    MAP_LAYER_CLICKED = 'map_layer_clicked'
}

export enum WorkspaceTools {
    MARKET_EVALUATOR = 'market_evaluator',
    LOS_CHECK = 'los_check'
}

export const SQM_2_SQFT = 10.7639;

export enum LinkCheckEvents {
    SET_INPUTS = 'link.set_inputs',
    CLEAR_INPUTS = 'link.clear_inputs',
    SHOW_INPUTS = 'link.show_inputs'
}

export enum LOSWSEvents {
    LIDAR_MSG = 'ws.lidar_msg',
    TERRAIN_MSG = 'ws.terrain_msg',
    LINK_MSG = 'ws.link_msg',
    VIEWSHED_MSG = 'ws.viewshed_msg',
    AP_MSG = 'ws.ap_msg',
    VIEWSHED_PROGRESS_MSG = 'ws.viewshed_progress_msg',
    VIEWSHED_UNEXPECTED_ERROR_MSG = 'ws.viewshed_unexpected_err_msg',
    STD_MSG = 'ws.std_msg',
    CPE_SECTOR_CREATED_MSG = 'ws.cpe_sector_created_msg'
}

export enum WS_AP_Events {
    STD_MSG = 'standard.message',
    AP_VIEWSHED = 'ap.viewshed',
    AP_STATUS = 'ap.status',
    AP_UNEXPECTED_ERROR = 'ap.unexpected_error',
    AP_ERROR = 'ap.error',
    AP_VIEWSHED_PROGRESS = 'ap.viewshed_progress',
    CPE_SECTOR_CREATED = 'cpe.sector_created'
}

export enum LOSWSHandlers {
    LIDAR = 'lidar',
    TERRAIN = 'terrain',
    LINK = 'link'
}

export type ASREvent = {
    featureProperties: any;
    height: number;
    radius: number;
};

export type LinkResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.LINK;
    error: string | null;
    hash: string;
    dist: number;
};

export type TerrainResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.TERRAIN;
    error: string | null;
    hash: string;
    source: string | null;
    dist: number;
    aoi: [number, number];
    terrain_profile: Array<{ elevation: number; lat: number; lng: number }>;
};

export type ViewShedResponse = {
    type: WS_AP_Events.AP_VIEWSHED;
    base_url: string;
    maxzoom: number;
    minzoom: number;
    uuid: string;
};

export type ViewshedUnexpectedError = {
    type: WS_AP_Events.AP_UNEXPECTED_ERROR;
    msg: string;
    uuid: string;
};

export type ViewshedProgressResponse = {
    type: WS_AP_Events.AP_VIEWSHED_PROGRESS;
    progress: string | null;
    time_remaining: number | null;
    uuid: string;
};

export type LidarResponse = {
    type: 'standard.message';
    handler: LOSWSHandlers.LIDAR;
    error: string | null;
    hash: string;
    source: Array<string>;
    lidar_profile: Array<number>;
    dist: number;
    res: number;
    url: Array<string>;
    bb: Array<number>;
    aoi: [number, number];
    rx: [number, number];
    tx: [number, number];
    still_loading: boolean;
};

export type AccessPointCoverageResponse = {
    type: WS_AP_Events.AP_STATUS;
    uuid: string;
};

export type CPESectorCreatedResponse = {
    type: WS_AP_Events.CPE_SECTOR_CREATED;
    added_features: Array<any>;
    deleted_features: Array<any>;
};

export type LOSCheckResponse = LinkResponse | TerrainResponse | LidarResponse;
export type WSResponse =
    | LOSCheckResponse
    | AccessPointCoverageResponse
    | CPESectorCreatedResponse
    | ViewShedResponse
    | ViewshedProgressResponse
    | ViewshedUnexpectedError;
