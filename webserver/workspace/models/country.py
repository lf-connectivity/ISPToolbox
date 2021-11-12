from enum import Enum
import pycountry


class IspToolboxCountry(Enum):
    US = 'US'
    CA = 'CA'
    BR = 'BR'


def ISO_3_COUNTRY(country: IspToolboxCountry) -> str:
    return pycountry.countries.get(alpha_2=country.value).alpha_3
