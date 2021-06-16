import { MarketEvaluatorPage } from '../MarketEvaluatorPage'
import { MarketEvaluatorSidebarManager } from '../organisms/MarketEvaluatorSidebarManager';
$(
    () => {
        //@ts-ignore
        window.mapboxgl.accessToken = window.mapbox_access_token;
        MarketEvaluatorSidebarManager.getInstance().initializePopovers();

        new MarketEvaluatorPage();
    }
);
