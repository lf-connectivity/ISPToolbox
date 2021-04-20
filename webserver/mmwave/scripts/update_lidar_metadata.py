import requests
import fiona
import tempfile
from mmwave.models import USGSLidarMetaDataModel
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall

wesm_endpoint = "https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/metadata/WESM.gpkg"
SUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Success] Automated LiDAR Metadata Update Successful"
UNSUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Failure] Automated LiDAR Metadata Update Failed"


def pull_latest_wesm_data(fp):
    """
    Use GET request to get gpkg file
    """
    resp = requests.get(wesm_endpoint)
    fp.write(resp.content)


def update_lidar_metadata():
    """
    1. Pull gpkg
    2. open with fiona
    3. for each layer, check if it already exists, if not create the layer
    """
    new_layers = []
    errors = []
    with tempfile.NamedTemporaryFile(suffix="-wesm.gpkg") as fp:
        pull_latest_wesm_data(fp)
        fp.seek(0)
        with fiona.open(fp.name, 'r', driver="GPKG") as src:
            for idx, layer in enumerate(src):
                if USGSLidarMetaDataModel.objects.filter(workunit=layer['properties']['workunit']).exists():
                    # Update object if it already exists
                    update = layer['properties'].copy()
                    del update['workunit']
                    USGSLidarMetaDataModel.objects.filter(workunit=layer['properties']['workunit']).update(**update)
                else:
                    # Create new object if it doesnt exist
                    try:
                        metadata_new = USGSLidarMetaDataModel(**(layer['properties']))
                        metadata_new.save()
                        new_layers.append(
                            metadata_new.workunit
                        )
                    except Exception as e:
                        errors.append(e)
    return new_layers, errors


def alert_oncall_status(new_layers, errors):
    """
    Alert oncall of the pipeline status
    """
    if len(errors) > 0:
        title = UNSUCCESSFUL_UPDATE_SUBJECT
    else:
        title = SUCCESSFUL_UPDATE_SUBJECT

    body = "New Layers:\n" + "\n".join(new_layers) + "\nErrors:\n" + "\n".join([str(e) for e in errors])
    sendEmailToISPToolboxOncall(title, body)
