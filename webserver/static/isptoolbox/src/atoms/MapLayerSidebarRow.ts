import { WorkspaceFeatureTypes } from '../workspace/WorkspaceConstants';

export const generateMapLayerSidebarRow = (
    feature: any,
    objectLabel: string,
    clickHandler: any,
    toggleHandler: any
) => {
    let elem = document.createElement('div');
    elem.classList.add('object-toggle-row');

    let icon = document.createElement('span');
    icon.innerHTML = objectImgIcons[feature.properties.feature_type];
    elem.appendChild(icon);

    let label = document.createElement('span');
    label.classList.add('label');
    label.innerHTML = objectLabel;
    label.addEventListener('click', () => {
        clickHandler(feature.properties.uuid);
    });
    elem.appendChild(label);

    // create toggle button
    let toggle = document.createElement('label');
    toggle.classList.add('toggle-switch');

    toggle.innerHTML = `<input type='checkbox' id="switch-user-layer-${feature.properties.uuid}" checked />`;
    let slider = document.createElement('div');
    slider.classList.add('slider');
    slider.addEventListener('click', (e) => toggleHandler(e, feature.properties.uuid));
    toggle.appendChild(slider);

    elem.appendChild(toggle);

    return elem;
};

const objectImgIcons: any = {
    [WorkspaceFeatureTypes.COVERAGE_AREA]: `<svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" cy-id="coverage-area-icon">
                <path d="M11.644 0.96875L1.16968 5.08165L7.35908 7.98491L6.40688 14.0333L12.8344 9.43652L11.644 0.96875Z" fill="#5692D1" fill-opacity="0.3" stroke="#5692D1"/>
                </svg>`,
    [WorkspaceFeatureTypes.AP]: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" cy-id="tower-icon">
                <g clip-path="url(#clip0)">
                <path d="M7.00008 13.7096C10.705 13.7096 13.7084 10.7062 13.7084 7.0013C13.7084 3.29639 10.705 0.292969 7.00008 0.292969C3.29517 0.292969 0.291748 3.29639 0.291748 7.0013C0.291748 10.7062 3.29517 13.7096 7.00008 13.7096Z" fill="#C2D8EC" stroke="#5692D1" stroke-width="0.958333"/>
                <path d="M6.99992 8.16536C7.64425 8.16536 8.16658 7.64303 8.16658 6.9987C8.16658 6.35437 7.64425 5.83203 6.99992 5.83203C6.35559 5.83203 5.83325 6.35437 5.83325 6.9987C5.83325 7.64303 6.35559 8.16536 6.99992 8.16536Z" fill="#5692D1"/>
                </g>
                <defs>
                <clipPath id="clip0">
                <rect width="14" height="14" fill="white"/>
                </clipPath>
                </defs>
                </svg>                
                `
};
