import CollapsibleComponent from '../atoms/CollapsibleComponent';

// More stuff will go in later right now the only purpose of this is to show/hide
// the bottom bar.
export default class LOSCheckLinkProfileView extends CollapsibleComponent {
    private static _instance: LOSCheckLinkProfileView;

    constructor() {
        if (!LOSCheckLinkProfileView._instance) {
            super();
            LOSCheckLinkProfileView._instance = this;

            $('#data-container').on('shown.bs.collapse', this.onShow.bind(this));
        }
    }

    protected showComponent() {
        //@ts-ignore
        $('#data-container').collapse('show');
    }

    protected hideComponent() {
        //@ts-ignore
        $('#data-container').collapse('hide');
    }

    static getInstance() {
        if (LOSCheckLinkProfileView._instance) {
            return LOSCheckLinkProfileView._instance;
        } else {
            throw Error('no instance of LOSCheckLinkProfileManager instantiated');
        }
    }
}
