import { MarketEvaluatorPage } from '../MarketEvaluatorPage'
$(
    () => {
        //@ts-ignore
        window.mapboxgl.accessToken = window.mapbox_access_token;

        new MarketEvaluatorPage();
    }
);
