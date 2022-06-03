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
            $('#data-container').on('hidden.bs.collapse', this.resetInputs.bind(this));
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

    protected resetInputs() {
        // revert inputs back to normal
        ['#lat-lng-0', '#lat-lng-1', '#hgt-0', '#hgt-1'].forEach((htmlId: string) => {
            let original = $(htmlId).data('original');
            if (original) {
                $(htmlId).val(original);
            }
            $(htmlId).removeClass('is-invalid');
        });

        ['#radio-update-btn-0', '#radio-update-btn-1'].forEach((buttonId: string) => {
            $(buttonId).addClass('d-none');
        });
    }

    static getInstance() {
        if (LOSCheckLinkProfileView._instance) {
            return LOSCheckLinkProfileView._instance;
        } else {
            throw Error('no instance of LOSCheckLinkProfileManager instantiated');
        }
    }
}
