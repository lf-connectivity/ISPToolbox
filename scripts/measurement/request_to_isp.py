import requests
import csv
from typing import Dict
import json
import hashlib
from collections import defaultdict
import pandas as pd
import backoff

ASNs = defaultdict(lambda x: ({},0))
VCards = defaultdict(lambda x: ({},0))

def IndexRDAP(response):
    vcards, asns = findVcard(response)
    for asn in asns:
        asn_hash = hashlib.md5(asn.encode("utf-8")).hexdigest()
        ASNs[asn_hash] = (asn, ASNs[asn_hash] + 1)
    for vcard in vcards:
        vcard_hash = hashlib.md5(vcard.encode("utf-8")).hexdigest()
        VCards[vcard_hash] = (vcard, ASNs[vcard_hash] + 1)
    print(asns)
    print(vcards)

@backoff.on_exception(backoff.expo,
                      requests.exceptions.RequestException)
def RDAPRequest(ip: str) -> Dict:
    resp = requests.get(f"https://rdap.arin.net/registry/ip/{ip}")
    return json.loads(resp.content)

def findVcard(response):
    dicts = []
    vcards = []
    asns = []
    dicts.append(response)
    while len(dicts) > 0:
        d = dicts.pop()
        if isinstance(d, dict):
            for key, value in d.items():
                print(key)
                if key == "vcardArray":
                    print("vcard found!")
                    vcards.append(value)
                elif "autnums" in key:
                    print("asn found!")
                    asns.append(value)
                else:
                    dicts.append(value)
        elif isinstance(d, list):
            for v in d:
                dicts.append(v)
        else:
            continue
    return vcards, asns


filename = "./isptoolbox_ips.csv"
with open(filename, 'r') as csvfile:
    datareader = csv.reader(csvfile)
    df = pd.DataFrame(columns=["ip","rdap"])

    for idx, row in enumerate(datareader):
        if idx == 0:
            continue
        ip = row[0]
        rdap = RDAPRequest(row[0])
        print((idx, ip))
        df = df.append({'ip': ip, 'rdap': rdap}, ignore_index=True)

df.to_csv("./rdap.csv")