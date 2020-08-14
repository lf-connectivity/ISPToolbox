import torch
import torch.nn as nn
import torch.nn.functional as F
import io
import cv2
import geojson
import math
import requests
from PIL import Image
import numpy as np
from time import time
import torch.cuda as cuda
from typing import List, Tuple, Optional
from shapely.geometry import Polygon, mapping
import json
from .vectorize_polygon import vectorize_building_prediction
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

GROUPS_IN_NORMALIZATION = 32
NON_LINEARITY = {"sigmoid": nn.Sigmoid, "log_softmax": nn.LogSoftmax}

class DecoderBlock(nn.Module):
    def __init__(self, in_channels, n_filters, group=1):
        super(DecoderBlock, self).__init__()

        # B, C, H, W -> B, C/4, H, W
        self.conv1 = nn.Conv2d(in_channels, in_channels // 4, 1, groups=group)
        self.norm1 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, in_channels // 4)
        self.relu1 = nn.ReLU(inplace=True)

        # B, C/4, H, W -> B, C/4, H, W
        self.deconv2 = nn.ConvTranspose2d(
            in_channels // 4,
            in_channels // 4,
            3,
            stride=2,
            padding=1,
            output_padding=1,
            groups=group,
        )
        self.norm2 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, in_channels // 4)
        self.relu2 = nn.ReLU(inplace=True)

        # B, C/4, H, W -> B, C, H, W
        self.conv3 = nn.Conv2d(in_channels // 4, n_filters, 1, groups=group)
        self.norm3 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, n_filters)
        self.relu3 = nn.ReLU(inplace=True)

        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                n = m.kernel_size[0] * m.kernel_size[1] * m.out_channels
                m.weight.data.normal_(0, math.sqrt(2.0 / n))
            elif isinstance(m, nn.ConvTranspose2d):
                n = m.kernel_size[0] * m.kernel_size[1] * m.out_channels
                m.weight.data.normal_(0, math.sqrt(2.0 / n))
            elif isinstance(m, nn.BatchNorm2d):
                m.weight.data.fill_(1)
                m.bias.data.zero_()
            elif isinstance(m, nn.GroupNorm):
                m.weight.data.fill_(1)
                m.bias.data.zero_()

    def forward(self, x):
        x = self.conv1(x)
        x = self.norm1(x)
        x = self.relu1(x)
        x = self.deconv2(x)
        x = self.norm2(x)
        x = self.relu2(x)
        x = self.conv3(x)
        x = self.norm3(x)
        x = self.relu3(x)
        return x

class Hourglass(nn.Module):
    def __init__(self, block, num_blocks, planes, depth):
        super(Hourglass, self).__init__()
        self.depth = depth
        self.block = block
        self.upsample = nn.Upsample(scale_factor=2)
        self.hg = self._make_hour_glass(block, num_blocks, planes, depth)

    def _make_residual1(self, block, num_blocks, planes):
        layers = []
        for _ in range(0, num_blocks):
            layers.append(block(planes * block.expansion, planes))
        return nn.Sequential(*layers)

    def _make_hour_glass(self, block, num_blocks, planes, depth):
        hg = []
        for i in range(depth):
            res = []
            for _ in range(3):
                res.append(self._make_residual1(block, num_blocks, planes))
            if i == 0:
                res.append(self._make_residual1(block, num_blocks, planes))
            hg.append(nn.ModuleList(res))
        return nn.ModuleList(hg)

    def _hour_glass_forward(self, n, x):
        rows = x.size(2)
        cols = x.size(3)

        up1 = self.hg[n - 1][0](x)
        low1 = F.max_pool2d(x, 2, stride=2, ceil_mode=True)
        low1 = self.hg[n - 1][1](low1)

        if n > 1:
            low2 = self._hour_glass_forward(n - 1, low1)
        else:
            low2 = self.hg[n - 1][3](low1)
        low3 = self.hg[n - 1][2](low2)
        up2 = self.upsample(low3)
        out = up1 + up2[:, :, :rows, :cols]
        return out

    def forward(self, x):
        return self._hour_glass_forward(self.depth, x)

class BasicBlockGN(nn.Module):
    """
    Basic Resnet Block with Group Norm.
    """

    expansion = 1

    def __init__(self, inplanes, planes, stride=1, downsample=None):
        super(BasicBlockGN, self).__init__()

        self.conv1 = nn.Conv2d(
            inplanes, planes, kernel_size=3, stride=stride, padding=1, bias=True
        )
        self.bn1 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, planes)
        self.relu = nn.ReLU(inplace=True)

        self.conv2 = nn.Conv2d(planes, planes, kernel_size=3, padding=1, bias=True)
        self.bn2 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, planes)
        self.is_downsample = True if downsample is not None else False
        if self.is_downsample:
            self.downsample = downsample

    def forward(self, x):
        residual = x

        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)

        if self.is_downsample:
            residual = self.downsample(x)

        out += residual
        out = self.relu(out)

        return out

class HourglassNetGNMS(nn.Module):
    """Hourglass model using Group Normalization with Multi-Scale Output."""

    """
    Newell et al ECCV 2016
    Reference of Paper:
        https://arxiv.org/pdf/1603.06937.pdf
    Part of code is borrowed from:
    https://github.com/bearpaw/pytorch-pose/blob/master/pose/models/hourglass.py
    """

    def __init__(
        self,
        block: nn.Module = BasicBlockGN,
        num_stacks: int = 2,
        num_blocks: int = 3,
        num_classes: int = 1,
        inplanes: int = 64,
        num_features: int = 128,
        num_input_channels: int = 3,
    ):
        super(HourglassNetGNMS, self).__init__()

        self.inplanes = inplanes
        self.num_feats = num_features
        self.num_stacks = num_stacks
        self.num_input_channels = num_input_channels
        self.conv1 = nn.Conv2d(
            self.num_input_channels,
            self.inplanes,
            kernel_size=7,
            stride=2,
            padding=3,
            bias=True,
        )
        self.bn1 = nn.GroupNorm(GROUPS_IN_NORMALIZATION, self.inplanes)
        self.relu = nn.ReLU(inplace=True)
        self.layer1 = self._make_residual(block, self.inplanes, 1)
        self.layer2 = self._make_residual(block, self.inplanes, 1)
        self.layer3 = self._make_residual(block, self.num_feats, 1)
        self.maxpool = nn.MaxPool2d(2, stride=2)

        # build hourglass modules
        ch = self.num_feats * block.expansion
        hg, res, fc, score, fc_, score_ = [], [], [], [], [], []
        for i in range(num_stacks):
            hg.append(Hourglass(block, num_blocks, self.num_feats, 3))
            res.append(self._make_residual(block, self.num_feats, num_blocks))
            fc.append(self._make_fc(ch, ch))
            score.append(nn.Conv2d(ch, num_classes, kernel_size=1, bias=True))
            if i < num_stacks - 1:
                fc_.append(nn.Conv2d(ch, ch, kernel_size=1, bias=True))
                score_.append(nn.Conv2d(num_classes, ch, kernel_size=1, bias=True))
        self.hg = nn.ModuleList(hg)
        self.res = nn.ModuleList(res)
        self.fc = nn.ModuleList(fc)
        self.score = nn.ModuleList(score)
        self.fc_ = nn.ModuleList(fc_)
        self.score_ = nn.ModuleList(score_)

        # Final Classifier
        self.decoder = DecoderBlock(self.num_feats, self.inplanes)
        self.decoder_score = nn.Conv2d(
            self.inplanes, num_classes, kernel_size=1, bias=True
        )
        self.finaldeconv = nn.ConvTranspose2d(self.inplanes, 32, 3, stride=2)
        self.finalrelu = nn.ReLU(inplace=True)
        self.finalconv = nn.Conv2d(32, 32, 3)
        self.finalclassifier = nn.Conv2d(32, num_classes, 2, padding=1)

    def _make_residual(self, block, planes, blocks, stride=1):
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(
                    self.inplanes,
                    planes * block.expansion,
                    kernel_size=1,
                    stride=stride,
                    bias=True,
                )
            )

        layers = []
        layers.append(block(self.inplanes, planes, stride, downsample))
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))

        return nn.Sequential(*layers)

    def _make_fc(self, inplanes, outplanes):
        bn = nn.GroupNorm(GROUPS_IN_NORMALIZATION, inplanes)
        conv = nn.Conv2d(inplanes, outplanes, kernel_size=1, bias=True)
        return nn.Sequential(conv, bn, self.relu)

    def forward(self, x):
        out = []
        rows = x.size(2)
        cols = x.size(3)

        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)

        x = self.layer1(x)
        x = self.maxpool(x)
        x = self.layer2(x)
        x = self.layer3(x)

        for i in range(self.num_stacks):
            y = self.hg[i](x)
            y = self.res[i](y)
            y = self.fc[i](y)
            score = self.score[i](y)
            if self.training:
                out.append(torch.sigmoid(score))
            if i < self.num_stacks - 1:
                score = self.score[i](y)
                fc_ = self.fc_[i](y)
                score_ = self.score_[i](score)
                x = x + fc_ + score_

        # Final Classification
        d = self.decoder(y)[
            :, :, : int(math.ceil(rows / 2.0)), : int(math.ceil(cols / 2.0))
        ]
        d_score = self.decoder_score(d)
        if self.training:
            out.append(torch.sigmoid(d_score))
        f1 = self.finaldeconv(d)
        f2 = self.finalrelu(f1)
        f3 = self.finalconv(f2)
        f4 = self.finalrelu(f3)
        f5 = self.finalclassifier(f4)
        if self.training:
            out.append(torch.sigmoid(f5))
            return out
        else:
            return torch.sigmoid(f5)

def load_state_dict(model, state_dict):
        """
        This is a wrapper function around model.load_state_dict to deal with
        the details around saving/loading into multi-gpu settings
        """
        # Remove 'module.' prefix so parameters can be loaded in a standardized way.
        prefix = "module."
        # Realize the keys generator into a list so we modify the keys as we iterate.
        for key in list(state_dict.keys()):
            if key.startswith(prefix):
                state_dict[key[len(prefix) :]] = state_dict.pop(key)
        # Load parameters into model
        if type(model) in (nn.parallel.DistributedDataParallel, nn.DataParallel):
            model.module.load_state_dict(state_dict)
        else:
            model.load_state_dict(state_dict)
        return model

net_filepath = "/mnt/efs/fs1/deep_gis/HourglassNetGNMS2259.dat"

target_zoom = 15
img_dim = 256
tile_pixels = 2048


class GeoJSON:
    """GeoJSON class which allows to calculate bbox"""
    def __init__(self, geojson):
        if geojson['type'] == 'FeatureCollection':
            self.coords = list(self._flatten([f['geometry']['coordinates']
                           for f in geojson['features']]))
            self.features_count = len(geojson['features'])
        elif geojson['type'] == 'Feature':
            self.coords = list(self._flatten([
                        geojson['geometry']['coordinates']]))
            self.features_count = 1
        else:
            self.coords = list(self._flatten([geojson['coordinates']]))
            self.features_count = 1

    def _flatten(self, l):
        for val in l:
            if isinstance(val, list):
                for subval in self._flatten(val):
                    yield subval
            else:
                yield val

    def bbox(self):
        return [min(self.coords[::2]), min(self.coords[1::2]),
                max(self.coords[::2]), max(self.coords[1::2])]

def getBoundingBox(inputGeoJson):
    gj = geojson.loads(inputGeoJson)
    return GeoJSON(gj).bbox()

def deg2num(lat_deg, lon_deg, zoom):
  lat_rad = math.radians(lat_deg)
  n = 2.0 ** zoom
  xtile = int((lon_deg + 180.0) / 360.0 * n)
  ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
  return (xtile, ytile)


def bbox_latlon_to_xy(min_lat, min_lon, max_lat, max_lon, level):
    """
    Trash

    @params min_lat, min_lon, max_lat, max_lon float: lat/lon bounding box
    @param level int: bing tile zoom level
    @return: min_x, min_y, max_x, max_y
    """
    x1, y1 = deg2num(min_lon, min_lat, level)
    x2, y2 = deg2num(max_lon, max_lat, level)
    assert x2 >= x1, "latitude should not cross 180: {}, {}".format(min_lon, max_lon)
    return x1, min(y1, y2), x2, max(y1, y2)

def bbox_to_bing_tiles(min_lat, min_lon, max_lat, max_lon, level):
    min_x, min_y, max_x, max_y = bbox_latlon_to_xy(
        min_lat, min_lon, max_lat, max_lon, level
    )
    res = []
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            res.append((x, y))
    return res

def getTiles(bb):
    delta = 1.0e-10
    deltas = (delta, delta, -delta, -delta)
    return bbox_to_bing_tiles(
        *[sum(x) for x in zip(bb, deltas)], level=target_zoom
    )

mapbox_access_token = "pk.eyJ1IjoiZmJtYXBzIiwiYSI6ImNqOGFmamkxdTBmbzUyd28xY3lybnEwamIifQ.oabgbuGc81ENlOJoPhv4OQ"
def getTileImages(tiles, supersample=3, progressUpdate=None):
    urlTemplate = 'https://api.tiles.mapbox.com/v4/mapbox.satellite/{}/{}/{}.png?access_token={}'
    images = []
    for tile in tiles:
        # super sample
        dst = Image.new('RGB', (img_dim * (2**supersample), img_dim * (2**supersample)))
        for j in range(2**supersample):
            for i in range(2**supersample):
                x = tile[0] * (2**supersample) + i
                y = tile[1] * (2**supersample) + j
                url = urlTemplate.format(target_zoom + supersample,x,y,mapbox_access_token)
                response = requests.get(url, stream=True)
                response.raw.decode_content = True
                image_data = io.BytesIO(response.raw.read())
                image = Image.open(image_data)
                dst.paste(image, (i * img_dim, j * img_dim))
        images.append(dst)
        if progressUpdate:
            progressUpdate()
    return images

def run_inference(net, array, on_gpu= True):
    """
    Inference the model on the input array
    @param net: pretrained model
    @param array: input numpy array to the model
    @param on_gpu: run inference on GPU
    @return: inference results in numpy array
    """
    if on_gpu and not torch.cuda.is_available():
        on_gpu = False

    with torch.no_grad():
        start_time = time()
        tensor = torch.from_numpy(array).float()
        if on_gpu:
            tensor = tensor.cuda()

        net_in = tensor.unsqueeze(0)

        scored = net(net_in)
        if isinstance(scored, List):
            scored = scored[-1]

        if on_gpu:
            ## Synchronize Cuda Operation
            torch.cuda.synchronize()

        average = scored[0, :, :, :]

        if on_gpu:
            average = average.cpu()

        average_cpu = average.data.numpy()

        print(
            f"Total {'GPU' if on_gpu else 'CPU'} Time => {time() - start_time} sec."
        )
        return average_cpu[0, :, :]

def loopInference(sat_imgs):
    output_mode = "L"
    masks = []
    net = HourglassNetGNMS()
    net_hourglass_checkpoint = torch.load(io.open(net_filepath, "rb"))
    net_hourglass = load_state_dict(net, net_hourglass_checkpoint["model_state_dict"])
    num_gpus = cuda.device_count()
    assert num_gpus >= 1, "Prediction needs one or more GPUs but no GPU detected"

    device = torch.device("cuda:0" if cuda.is_available() else "cpu")  # noqa
    if num_gpus > 1:
        net_hourglass = nn.DataParallel(net_hourglass)
    net_hourglass.to(device)  # noqa

    for i, img in enumerate(sat_imgs):
        img_np = np.array(img).transpose(2, 0, 1)
        out_np = (run_inference(net_hourglass, img_np, on_gpu=True) * 255).astype(np.uint8)
        out_pil = Image.fromarray(out_np, mode=output_mode)
        masks.append(out_pil)
    return masks

def _get_xy_range_from_tile_names(zoom, tiles):
    x0 = min(tiles,key=lambda x:x[0])[0]
    x1 = max(tiles,key=lambda x:x[0])[0]
    y0 = min(tiles,key=lambda x:x[1])[1]
    y1 = max(tiles,key=lambda x:x[1])[1]
    return (x0, x1, y0, y1)

def num2deg(xtile, ytile, zoom):
  n = 2.0 ** zoom
  lon_deg = xtile / n * 360.0 - 180.0
  lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
  lat_deg = math.degrees(lat_rad)
  return (lat_deg, lon_deg)


def stitchMasks(masks, tiles, target_zoom=target_zoom):
    # Stitch the prediction mask into one image
    x0, x1, y0, y1 = _get_xy_range_from_tile_names(target_zoom, tiles)
    max_lat, min_lon = num2deg(x0, y0, target_zoom)
    min_lat, max_lon = num2deg(x1 + 1, y1 + 1, target_zoom)
    print((x0, x1, y0, y1))
    print((min_lon, min_lat, max_lon, max_lat))

    # ygrid: no. of masks along y, xgrid: no. of masks along x
    ygrid, xgrid = y1 + 1 - y0, x1 + 1 - x0

    # calculate new width and height based on number of masks and tile size
    width, height = xgrid * 2048, ygrid * 2048

    out = Image.new("L", (width, height))

    for i, tile in enumerate(tiles):
        row_offset, col_offset = (tile[1] - y0) % ygrid, (tile[0] - x0) % xgrid
        img = masks[i]
        out.paste(im=img, box=(col_offset * 2048, row_offset * 2048))

    return out, (min_lon, min_lat, max_lon, max_lat)

BUILDING_WHITE_THRESHOLD = 0.2 * 255
def threshold_buildings(mask):
    building_raster_np = np.array(mask)

    building_raster_img = cv2.compare(
        building_raster_np, BUILDING_WHITE_THRESHOLD, cv2.CMP_GE
    )
    return Image.fromarray(building_raster_img)

def min_area_rect_polygon_from_contour(contour: np.array) -> Polygon:
    rect = cv2.minAreaRect(contour)
    box = cv2.boxPoints(rect)
    box = box.astype("int")
    return Polygon(shell=box)

BUILDING_WHITE_THRESHOLD = 0.2 * 255
BUILDING_SIMPLIFY_AREA_THRESHOLD = 0.05
BUILDING_POLYGON_SIMPLIFY_TOLERANCE = 1
BUILDING_MINIMUM_AREA = 1.0
BUILDING_MINIMUM_AREA_HOUGH = 300
def polygonize_buildings(mask: Image.Image, mode: str = "HOUGH") -> List[Polygon]:
    """
    Polygonize a building prediction mask in PIL Image
    Output the building polygons
    """

    building_raster_img = np.array(mask)

    contours, _ = cv2.findContours(
        building_raster_img, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )
    logger.info(f"Number of building contours: {len(contours)}")

    building_polygons = []

    for contour in contours:
        # must have enough points for fomulate a polygon
        if len(contour) <= 3:
            continue

        if mode == "SIMPLIFY":
            poly = Polygon(shell=contour[:, 0, :])
            simplified_poly = poly.simplify(
                BUILDING_POLYGON_SIMPLIFY_TOLERANCE, preserve_topology=True
            )

            if poly.area <= BUILDING_MINIMUM_AREA:
                # ignore tiny buildings
                continue

            if (
                abs(poly.area - simplified_poly.area) / poly.area
                > BUILDING_SIMPLIFY_AREA_THRESHOLD
            ):
                # use original polygon
                accepted_poly = poly
            else:
                # use simplified polygon
                accepted_poly = simplified_poly

        elif mode == "RECT":
            # Get the 4 points of the bounding rectangle with the minimum area
            accepted_poly = min_area_rect_polygon_from_contour(contour)

            if accepted_poly.area <= BUILDING_MINIMUM_AREA:
                # ignore tiny buildings
                continue

        elif mode == "HOUGH":

            # Get the area of minimum area rectangle
            _, min_area_rect_size, _ = cv2.minAreaRect(contour)
            area = min_area_rect_size[0] * min_area_rect_size[1]

            # Initialize accepted_poly to None
            accepted_poly = None
            if area >= BUILDING_MINIMUM_AREA_HOUGH:
                polygon_contour = vectorize_building_prediction(
                    building_raster_img, contour
                )
                accepted_poly = Polygon(polygon_contour)

            # If Hough approach failed to generate a polygon, use minimum-area rectangle
            # as failover
            if (
                accepted_poly is None
                or accepted_poly.is_empty
                or not accepted_poly.is_valid
            ):
                accepted_poly = min_area_rect_polygon_from_contour(contour)

        else:
            raise AssertionError("Incorrect mode for building vectorization!")

        building_polygons.append(accepted_poly)

    return building_polygons

def xy_to_latlon(geo_trans, x, y):
    """Returns global lat, long coordinates from pixel x, y coords
    params:
        @geo_trans: Affine transformation coordinates of the geotiff
        @x: X coordinate of the pixel in the raster image
        @y: Y coordinate of the pixel in the raster image
    return:
        @lon: Longitude in world coordinates
        @lat: Latitude in world coordinates
    """
    xoff, a, b, yoff, d, e = geo_trans
    lon = a * x + b * y + xoff
    lat = d * x + e * y + yoff
    return (lon, lat)

def convert_polygons_to_latlon(
    polygons: List[Polygon],
    raster_size: Tuple[int, int],
    latlon_bounds: Tuple[float, float, float, float],
) -> List[Polygon]:
    """
    Convert polygons in pixel x/y to lat/lon
    @param: raster_size, a tuple of (width, height)
    @param: latlon_bounds, a tuple of (min_lon, min_lat, max_lon, max_lat)
    """

    print(f"Raster width and height: {raster_size[0], raster_size[1]}")

    geo_trans = [
        latlon_bounds[0],
        (latlon_bounds[2] - latlon_bounds[0]) / float(raster_size[0]),
        0.0,
        latlon_bounds[3],
        0.0,
        (latlon_bounds[1] - latlon_bounds[3]) / float(raster_size[1]),
    ]

    building_polygons = []

    # convert to lat/lon
    for poly in polygons:

        points = []

        for i in range(len(poly.exterior.xy[0])):
            lon, lat = xy_to_latlon(
                geo_trans, poly.exterior.xy[0][i], poly.exterior.xy[1][i]
            )
            points.append([lon, lat])

        latlon_poly = Polygon(shell=points)
        building_polygons.append(latlon_poly)

    return building_polygons


def convertToGeoJsons(polys_latlng):
    return [json.dumps(mapping(poly)) for poly in polys_latlng]
