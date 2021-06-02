import { LinkCheckPage } from '../LinkCheckPage'

$(
    () => {
        //@ts-ignore
        window.mapboxgl.accessToken = window.mapbox_access_token;
        //@ts-ignore
        const networkID = window.networkID;
        //@ts-ignore
        const userRequestIdentity = window.userRequestIdentity;
        //@ts-ignore
        let radio_names = window.radio_names;
        if (radio_names === undefined) {
            radio_names = ['ap', 'cpe']
        }
        new LinkCheckPage(networkID, userRequestIdentity, radio_names);
    }
);