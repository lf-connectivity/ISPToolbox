const US_STATE_ABBREVIATIONS = {
    'Alabama': 'AL',
    'Alaska': 'AK',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Connecticut': 'CT',
    'District of Columbia': 'DC',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Hawaii': 'HI',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY',
};

const DEFAULT_STREET = 'Unknown Street Name';

export function isBeta() : boolean{
    const contents = document.getElementById('los_beta')?.textContent;
    if(typeof contents !== "string"){
        return false
    }
    return JSON.parse(contents);
}

export function getStreetAndAddressInfo(mapboxPlace: string) {
    // Address should be in the form <stuff>, street, city, state ZIP CODE, USA
    let components = mapboxPlace.split(', ').reverse()
    
    // Change state name (state ZIP) to "<abbreviated state>, zip"
    let stateName = components[1].split(' ').slice(0, -1).join(' ');
    let zipCode = components[1].split(' ').slice(-1)[0];

    return {
        // @ts-ignore
        city: `${components[2]}, ${US_STATE_ABBREVIATIONS[stateName]}, ${zipCode}`,
        street: components[3] || DEFAULT_STREET
    };
}