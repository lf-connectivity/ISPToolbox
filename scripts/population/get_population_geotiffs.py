from lxml import html
import requests
import shlex
import subprocess

# Use this script to get the links to the geotiffs and download to output path
base_url = 'https://data.humdata.org'

host_url = 'https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates'
output_path = '~/hrsl/'

if __name__ == "__main__":
    subprocess.run(shlex.split(f'mkdir {output_path}'))

    page = requests.get(host_url).content
    tree = html.fromstring(page)
    # Get all the download buttons
    links = tree.xpath('.//a[@title="Download"]')

    for link in links:
        href = link.attrib.get('href')
        if 'population_usa' in href:
            download_link = base_url + href
            subprocess.run(shlex.split(
                f'wget -P {output_path} {download_link}'))
