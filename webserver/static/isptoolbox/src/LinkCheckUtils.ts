import { validateNumber, validateString } from './molecules/InputValidator';

const US_STATE_ABBREVIATIONS = {
    Alabama: 'AL',
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Connecticut: 'CT',
    'District of Columbia': 'DC',
    Florida: 'FL',
    Georgia: 'GA',
    Hawaii: 'HI',
    Idaho: 'ID',
    Illinois: 'IL',
    Indiana: 'IN',
    Iowa: 'IA',
    Kansas: 'KS',
    Kentucky: 'KY',
    Louisiana: 'LA',
    Maine: 'ME',
    Maryland: 'MD',
    Massachusetts: 'MA',
    Michigan: 'MI',
    Minnesota: 'MN',
    Mississippi: 'MS',
    Missouri: 'MO',
    Montana: 'MT',
    Nebraska: 'NE',
    Nevada: 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oklahoma: 'OK',
    Oregon: 'OR',
    Pennsylvania: 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Vermont: 'VT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wisconsin: 'WI',
    Wyoming: 'WY'
};

export const MIN_LAT = -90;
export const MAX_LAT = 90;

export const MIN_LNG = -180;
export const MAX_LNG = 180;

export const MIN_RADIUS = 0.01;
export const MAX_RADIUS = 10;

export const MIN_HEIGHT = 0;
export const MAX_HEIGHT = 1000;

export const MAX_NAME_LEN = 50;

const DEFAULT_STREET = 'Unknown Street Name';

export function isBeta(): boolean {
    const waffle = (window as any).waffle;
    if (waffle !== undefined) {
        try {
            return waffle.flag_is_active('beta');
        } catch (e) {
            return false;
        }
    }
    return false;
}

export function getStreetAndAddressInfo(mapboxPlace: string) {
    // Address should be in the form <stuff>, street, city, state ZIP CODE, COUNTRY
    let components = mapboxPlace.split(', ').reverse();
    let zipCode = components[1].split(' ').slice(-1)[0];

    // Format "state name" differently for Puerto Rico and US.
    // TODO: support for other countries
    let countryName = components[0];
    let city;
    if (countryName === 'United States') {
        // Change state name (state ZIP) to "<abbreviated state>, zip"
        let stateName = components[1].split(' ').slice(0, -1).join(' ');
        // @ts-ignore
        city = `${components[2]}, ${US_STATE_ABBREVIATIONS[stateName]}, ${zipCode}`;
    } else if (countryName === 'Puerto Rico') {
        city = `${components[2]}, PR, ${zipCode}`;
    } else {
        city = `${components[2]}, Unsupported Country`;
    }

    return {
        city: city,
        street: components[3] || DEFAULT_STREET
    };
}

export const validateLng = validateNumber.bind(undefined, MIN_LNG, MAX_LNG);
export const validateLat = validateNumber.bind(undefined, MIN_LAT, MAX_LAT);
export const validateRadius = validateNumber.bind(undefined, MIN_RADIUS, MAX_RADIUS);
export const validateHeight = validateNumber.bind(undefined, MIN_HEIGHT, MAX_HEIGHT);
export const validateName = validateString.bind(undefined, MAX_NAME_LEN);
