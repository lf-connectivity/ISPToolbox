import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { getCookie } from '../utils/Cookie';
import { getSessionID, isUnitsUS } from '../utils/MapPreferences';

export class TowerPaginationModal {
    constructor(private selector: string, private map: mapboxgl.Map, private draw: MapboxDraw) {
        $(this.selector).on('shown.bs.modal', () => {
            this.getAccessPoints(undefined);
        });
    }

    updateAccessPoint(msg: string, feature: any) {
        if (feature.properties.uuid) {
            $.ajax({
                url: `/pro/workspace/api/ap-los/${feature.properties.uuid}/`,
                method: 'PATCH',
                data: {
                    max_radius: feature.properties.radius,
                    location: JSON.stringify(feature.geometry),
                    height: feature.properties.height,
                    name: feature.properties.name
                },
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    Accept: 'application/json'
                }
            }).done(() => {});
        }
    }

    getAccessPoints(
        data:
            | {
                  ordering: undefined | string;
                  page: undefined | string;
                  session: string | null | undefined;
              }
            | undefined
    ) {
        if (data != null) {
            data['session'] = getSessionID();
        } else {
            data = { session: getSessionID(), ordering: undefined, page: undefined };
        }
        $('#ap-list-modal-body-loading').removeClass('d-none');
        $('#ap-list-modal-body').addClass('d-none');
        $.get(
            '/pro/workspace/api/ap-los/',
            data ? data : '',
            (result) => {
                $('#ap-list-modal-body-loading').addClass('d-none');
                $('#ap-list-modal-body').html(result).removeClass('d-none');
            },
            'html'
        )
            .fail(() => {})
            .done(() => {
                this.addModalCallbacks();
            });
    }

    addModalCallbacks() {
        $('.sort-ap').on('click', (event) => {
            const ordering = event.currentTarget.getAttribute('ordering-target') as string;
            const page = $('#ap-modal-page-num').val() as string;
            this.getAccessPoints({ ordering, page, session: undefined });
        });

        $('.ap-modal-page-change').on('click', (event) => {
            const ordering = $('#ap-modal-ordering').val() as string;
            const page = event.currentTarget.getAttribute('page-target') as string;
            this.getAccessPoints({ ordering, page, session: undefined });
        });

        $(`.ap-delete-btn`).on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            if (typeof uuid === 'string') {
                const fc = this.draw.getAll();
                const feats = fc.features.filter((feat: any) => feat.properties.uuid === uuid);
                const feat_ids = feats.map((feat: any) => feat.id);
                this.draw.delete(feat_ids);
                this.map.fire('draw.delete', { features: feats });
            }
        });

        $('.ap-edit-btn').on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            event.currentTarget.classList.add('d-none');
            if (typeof uuid === 'string') {
                $(`input[ap-uuid-target='${uuid}']`).removeAttr('disabled');
                $(`#ap-save-edit-${uuid}`).removeClass('d-none');
            }
        });

        $('.ap-save-edit-btn').on('click', (event) => {
            const uuid = event.currentTarget.getAttribute('data-target');
            const drawn_features = this.draw.getAll();
            const ap = drawn_features.features.filter((feat: any) => feat.properties.uuid === uuid);
            $(`input[ap-uuid-target=${uuid}]`).each((idx, elem) => {
                ap.forEach((feat: any) => {
                    let attr_name = elem.getAttribute('name');
                    let val = $(elem).val();
                    if (isUnitsUS()) {
                        switch (attr_name) {
                            case 'height':
                                //@ts-ignore
                                val = parseFloat(val) * 0.3048;
                                break;
                            case 'max_radius':
                                attr_name = 'radius';
                                //@ts-ignore
                                val = parseFloat(val) * 1.60934;
                                break;
                            default:
                        }
                    }
                    if (attr_name) {
                        this.draw.setFeatureProperty(feat.id, attr_name, val);
                    }
                });
            });
            const feats = ap.map((feat: any) => this.draw.get(feat.id));
            this.map.fire('draw.update', { features: feats });
            $(`#ap-save-edit-${uuid}`).addClass('d-none');
            $(`input[ap-uuid-target='${uuid}']`).prop('disabled', true);
            $(`.ap-edit-btn[data-target='${uuid}']`).removeClass('d-none');
        });
    }
}
