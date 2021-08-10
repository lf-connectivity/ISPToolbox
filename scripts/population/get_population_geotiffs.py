from lxml import html
import asyncio
import requests
import shlex
import os

# No crashing
CONCURRENCY_LIMIT = 10

# Use this script to get the links to the geotiffs and download to output path
base_url = 'https://data.humdata.org'

host_url = 'https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates'
output_path = os.path.expanduser('~/hrsl/')


# https://stackoverflow.com/questions/48483348/how-to-limit-concurrency-with-python-asyncio/61478547#61478547
async def gather_with_concurrency(*tasks):
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    async def sem_task(task):
        async with semaphore:
            return await task
    return await asyncio.gather(*(sem_task(task) for task in tasks))


async def main():
    if not os.path.exists(output_path):
        os.mkdir(output_path)

    page = requests.get(host_url).content
    tree = html.fromstring(page)
    # Get all the download buttons
    links = tree.xpath('.//a[@title="Download"]')
    dl_links = []

    for link in links:
        href = link.attrib.get('href')
        if 'population_usa' in href:
            download_link = base_url + href
            dl_links.append(download_link)

    async def dl(link):
        proc = await asyncio.create_subprocess_exec(*shlex.split(f'wget -P {output_path} {link}'))
        await proc.wait()

    await gather_with_concurrency(*[dl(link) for link in dl_links])

if __name__ == "__main__":
    asyncio.run(main())
