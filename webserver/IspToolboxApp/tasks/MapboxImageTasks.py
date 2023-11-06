# (c) Meta Platforms, Inc. and affiliates. Copyright
from PIL import Image
import requests
import io
img_dim = 256
target_zoom = 15

mapbox_access_token = "pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ"


def getTileImages(tiles, supersample=3, progressUpdate=None):
    urlTemplate = 'https://api.tiles.mapbox.com/v4/mapbox.satellite/{}/{}/{}.png?access_token={}'
    images = []
    for tile in tiles:
        # super sample
        dst = Image.new('RGB',
                        (img_dim * (2**supersample),
                         img_dim * (2**supersample)))
        for j in range(2**supersample):
            for i in range(2**supersample):
                x = tile[0] * (2**supersample) + i
                y = tile[1] * (2**supersample) + j
                url = urlTemplate.format(
                    target_zoom + supersample, x, y, mapbox_access_token)
                response = requests.get(url, stream=True)
                response.raw.decode_content = True
                image_data = io.BytesIO(response.raw.read())
                image = Image.open(image_data)
                dst.paste(image, (i * img_dim, j * img_dim))
        images.append(dst)
        if progressUpdate:
            progressUpdate()
    return images
