import { BroadbandNowResponse, BuildingOverlaysResponse, MarketEvalWSEvents, MedianIncomeResponse, MedianSpeed, MedianSpeedResponse, ServiceProvidersResponse } from "../MarketEvaluatorWS";
import { getCookie } from "../utils/Cookie";
import { WorkspaceEvents } from "../workspace/WorkspaceConstants";

const BUILDING_COUNT_BASE_ID = 'me-out-buildings';
const BUILDING_DENSITY_BASE_ID = 'me-out-density';
const MARKET_PENETRATION_INPUT_ID = 'market_penetration_percent';
const POTENTIAL_LEADS_BASE_ID = 'me-out-leads';
const SERVICE_PROVIDERS_BASE_ID = 'me-out-providers';
const AVG_INCOME_BASE_ID = 'me-out-income';
const MEDIAN_SPEEDS_BASE_ID = 'me-out-speeds';

const COMPETITOR_MODAL_LOADED_ID = 'me-competitor-modal-loaded';
const COMPETITOR_MODAL_NOT_LOADED_ID = 'me-competitor-modal-not-loaded';

const SIDEBAR_VALUE_DIV_CLASS = 'market-eval-section--value';
const SIDEBAR_VALUE_LOADED_CLASS = 'loaded'

const DEFAULT_PADDING = 1;

const PADDING: {[elt: string]: number} = {
    [BUILDING_COUNT_BASE_ID]: 3,
    [POTENTIAL_LEADS_BASE_ID]: 3
}

const LOADING_ENDING: {[elt: string]: string} = {
    [BUILDING_COUNT_BASE_ID]: '+',
    [BUILDING_DENSITY_BASE_ID]: '+',
    [MARKET_PENETRATION_INPUT_ID]: '+',
    [POTENTIAL_LEADS_BASE_ID]: '+',
    [SERVICE_PROVIDERS_BASE_ID]: '+',
}

const MODAL_AJAX_URL = '/pro/modals/market-eval-competitor-modal/';

export class MarketEvaluatorSidebarManager {
    private buildingCount: number;
    private polygonArea: number;
    private marketPenetrationPct: number;
    private buildingOverlaysLoading: boolean;
    private serviceProvidersResponse: ServiceProvidersResponse | undefined;
    private bbnResponse: BroadbandNowResponse | undefined;

    private static instance: MarketEvaluatorSidebarManager;

    private constructor() {
        PubSub.subscribe(MarketEvalWSEvents.SEND_POLYGON_REQUEST, this.onSendPolygonRequest.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.BUILDING_OVERLAYS_MSG, this.onBuildingOverlayMsg.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.POLY_AREA_MSG, this.onPolygonAreaMsg.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.SERVICE_PROV_MSG, this.onServiceProviderMsg.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.BROADBAND_NOW_MSG, this.onBbnMsg.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.INCOME_MSG, this.onIncomeMsg.bind(this));
        PubSub.subscribe(MarketEvalWSEvents.SPEEDS_MSG, this.onSpeedsMsg.bind(this));
        PubSub.subscribe(WorkspaceEvents.NO_ITEMS, this.onNoItems.bind(this));

        $(`#${MARKET_PENETRATION_INPUT_ID}`).on('change', (e) => {
            this.updateMarketPenetrationPct();
            this.updatePotentialLeads();
        }) 

        this.resetStats();
    }

    public static getInstance(): MarketEvaluatorSidebarManager {
        if (!MarketEvaluatorSidebarManager.instance) {
            MarketEvaluatorSidebarManager.instance = new MarketEvaluatorSidebarManager();
        }
        return MarketEvaluatorSidebarManager.instance;
    }

    public initializePopovers() {
        console.log('initilaize popover');
        // @ts-ignore
        // $('[data-toggle="popover"]').popover();
        // link tooltip button to the contents
        // @ts-ignore
        $("[data-toggle=popover]").popover({
            html: true,
            class: "btn info-tooltip-button",
            content: function () {
                var content = $(this).attr("data-popover-content");
                return content;
            },
            title: function () {
                var title = $(this).attr("data-popover-title");
                return title;
            }
        });
        //keep popover open to allow user to click on links inside
        $('body').on('click', function (e) {
            $('[data-toggle="popover"]').each(function () {
                if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover')
                    .has(e
                        .target).length === 0) {
                    // @ts-ignore
                    $(this).popover('hide');
                }
            });
        });
        // Only one popover opens at a time
        // @ts-ignore
        $('body').popover({
            selector: '[rel=popover]',
            trigger: "click"
        }).on("show.bs.popover", function (e: any) {
            // @ts-ignore
            $("[rel=popover]").not(e.target).popover("destroy");
            $(".popover").remove();
        });
    }

    private resetSidebar(isLoading = true) {
        this.buildingOverlaysLoading = isLoading;
        this.setIDValue(BUILDING_COUNT_BASE_ID, this.buildingCount, this.buildingOverlaysLoading, true);
        this.setIDValue(BUILDING_DENSITY_BASE_ID, 0, this.buildingOverlaysLoading, true);
        this.setIDValue(POTENTIAL_LEADS_BASE_ID, 0, this.buildingOverlaysLoading, true);
        this.setIDValue(AVG_INCOME_BASE_ID, '$000K', isLoading, true);
        this.setIDValue(SERVICE_PROVIDERS_BASE_ID, 0, isLoading, true);
        this.setIDValue(MEDIAN_SPEEDS_BASE_ID, '0/0', isLoading, true);
        this.updateCompetitorModalLink(true);

        $(`#${MARKET_PENETRATION_INPUT_ID}`).prop('disabled', !isLoading);
    }

    private resetStats() {
        this.buildingCount = 0;
        this.polygonArea = 0;
        this.serviceProvidersResponse = undefined;
        this.bbnResponse = undefined;
        this.buildingOverlaysLoading = false;
        this.updateMarketPenetrationPct();
    }

    /*
    * EVENT HANDLERS
    */

    private onSendPolygonRequest() {
        this.resetStats();
        this.resetSidebar();
    }

    private onNoItems(msg: any, response: any) {
        this.resetStats();
        this.resetSidebar(false);    
    }

    private onBuildingOverlayMsg(msg: any, response: BuildingOverlaysResponse) {
        if (response.gc !== null && response.offset !== null) {
            this.buildingOverlaysLoading = !response.done;
            if (response.offset == '0') {
                this.buildingCount = 0;
            }

            this.buildingCount += response.gc.geometries.length;
            this.setIDValue(BUILDING_COUNT_BASE_ID, this.buildingCount, this.buildingOverlaysLoading);
            this.updateBuildingDensity();
            this.updatePotentialLeads();
        }
    }

    private onPolygonAreaMsg(msg: any, area: number) {
        this.polygonArea = area;
        this.updateBuildingDensity();
    }

    private onServiceProviderMsg(msg: any, response: ServiceProvidersResponse) {
        this.serviceProvidersResponse = response;
        this.setIDValue(SERVICE_PROVIDERS_BASE_ID, response.competitors.length, false, false);
        this.updateCompetitorModalLink(false);
    }

    private onBbnMsg(msg: any, response: BroadbandNowResponse) {
        this.bbnResponse = response;
        this.updateCompetitorModalLink(false);
    }

    private onIncomeMsg(msg: any, response: MedianIncomeResponse) {
        let incomeInThousands = Math.trunc(response.averageMedianIncome / 1000.0);
        this.setIDValue(AVG_INCOME_BASE_ID, `\$${incomeInThousands}K`, false, false);
    }

    private onSpeedsMsg(msg: any, response: MedianSpeedResponse) {
        let medianDownload = 0;
        let medianUpload = 0;

        if (response.length > 0) {
            // Check if there's a percent area that exists, because
            // it might not be there, especially with complex polygons.
            if (response[0].pct_area) {
                response.forEach((zip: MedianSpeed) => {
                    medianDownload += parseFloat(zip['Download (Mbit/s)']) * parseFloat(zip.pct_area);
                    medianUpload += parseFloat(zip['Upload (Mbit/s)']) * parseFloat(zip.pct_area);
                });
            }
            else {
                response.forEach((zip: MedianSpeed) => {
                    medianDownload += parseFloat(zip['Download (Mbit/s)']) / response.length;
                    medianUpload += parseFloat(zip['Upload (Mbit/s)']) / response.length;
                });
            }
            
    
            medianDownload = Math.round(medianDownload);
            medianUpload = Math.round(medianUpload)
    
            this.setIDValue(MEDIAN_SPEEDS_BASE_ID, `${medianDownload}/${medianUpload}`, false, false);
        }
        else {
            this.setIDValue(MEDIAN_SPEEDS_BASE_ID, `N/A`, false, false);
        }

    }

    /*
    * VALUE UPDATERS
    */

    private updateBuildingDensity() {
        let buildingDensity = 0;
        if (this.polygonArea !== 0) {
            buildingDensity = this.buildingCount / this.polygonArea;
        }

        let message = buildingDensity.toFixed(2);
        this.setIDValue(BUILDING_DENSITY_BASE_ID, message, this.buildingOverlaysLoading, this.buildingOverlaysLoading);
    }

    private updatePotentialLeads() {
        let potentialLeads = Math.floor(this.marketPenetrationPct * this.buildingCount);
        this.setIDValue(POTENTIAL_LEADS_BASE_ID, potentialLeads, this.buildingOverlaysLoading, this.buildingOverlaysLoading);
    }

    private updateMarketPenetrationPct() {
        this.marketPenetrationPct = Number($(`#${MARKET_PENETRATION_INPUT_ID}`).val()) / 100.0;
    }

    private updateCompetitorModalLink(isLoading: boolean) {
        if (isLoading) {
            this.toggleShowElement(COMPETITOR_MODAL_LOADED_ID, false);
            this.toggleShowElement(COMPETITOR_MODAL_NOT_LOADED_ID, true);
        }
        else {
            if (this.serviceProvidersResponse !== undefined && this.bbnResponse !== undefined) {
                $.ajax({
                    url: MODAL_AJAX_URL,
                    method: 'POST',
                    data: JSON.stringify({
                        serviceProvidersResponse: this.serviceProvidersResponse,
                        broadbandNowResponse: this.bbnResponse
                    }),
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'Accept': 'application/json'
                    }
                }).done((result) => {
                    $('#showCompetitorsModal').html(result);
                    this.toggleShowElement(COMPETITOR_MODAL_LOADED_ID, true);
                    this.toggleShowElement(COMPETITOR_MODAL_NOT_LOADED_ID, false);
                });
            }
        }
    }

    private setIDValue(element: string, value: any, isLoading: boolean, grayOut: boolean=false) {
        // Get the padding. If the id value is defined in padding, use that,
        // otherwise use the default.
        let padding = PADDING[element] || DEFAULT_PADDING;

        let html;
        let parent = $(`#${element}`).parent();
        // Don't pad if not graying out.
        if (!grayOut) {
            html = String(value);
            if (parent.hasClass(SIDEBAR_VALUE_DIV_CLASS)) {
                parent.addClass(SIDEBAR_VALUE_LOADED_CLASS);
            }
        }
        else {
            html = String(value).padStart(padding, '0') + (LOADING_ENDING[element] || '');
            if (parent.hasClass(SIDEBAR_VALUE_DIV_CLASS)) {
                parent.removeClass(SIDEBAR_VALUE_LOADED_CLASS);
            }
        }

        $(`#${element}`).html(html);
        this.toggleShowElement(`${element}-loading-spinner`, isLoading);
    }

    private toggleShowElement(element: string, show: boolean) {
        if (show) {
            $(`#${element}`).removeClass('d-none');
        }
        else {
            $(`#${element}`).addClass('d-none');
        }
    }
}