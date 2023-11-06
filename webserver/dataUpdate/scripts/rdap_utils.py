# (c) Meta Platforms, Inc. and affiliates. Copyright
import requests
from typing import Dict, List, Tuple
import json
import backoff


@backoff.on_exception(backoff.expo,
                      requests.exceptions.RequestException)
def RDAPRequest(ip: str) -> Dict:
    resp = requests.get(f"https://rdap.arin.net/registry/ip/{ip}")
    return json.loads(resp.content)


def RDAP_ASNs(response: Dict) -> List:
    for key, value in response.items():
        if "autnums" in key:
            return value
    return []


def parseRDAP(response: Dict) -> Tuple:
    dicts = []
    vcards = []
    asns = []
    dicts.append(response)
    while len(dicts) > 0:
        d = dicts.pop()
        if isinstance(d, dict):
            for key, value in d.items():
                if key == "vcardArray":
                    vcards.append(value)
                elif "autnums" in key:
                    asns.append(value)
                else:
                    dicts.append(value)
        elif isinstance(d, list):
            for v in d:
                dicts.append(v)
        else:
            continue
    return vcards, asns
