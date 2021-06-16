import { MarketEvaluatorPage } from '../MarketEvaluatorPage'
import { ToolTipManager } from '../organisms/ToolTipManager';
$(
    () => {
        //@ts-ignore
        window.mapboxgl.accessToken = window.mapbox_access_token;
        ToolTipManager.getInstance().initializePopovers();

        new MarketEvaluatorPage();
    }
);
