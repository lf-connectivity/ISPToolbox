# (c) Meta Platforms, Inc. and affiliates. Copyright
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from workspace.models import (
    AccessPointCoverageBuildings, AccessPointLocation
)


def createWorkspaceChannel(channel_id: str) -> str:
    return 'los_check_%s' % channel_id


def sendMessageToChannel(channel_id: str, msg: dict):
    channel_name = createWorkspaceChannel(channel_id)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(channel_name, msg)


def updateClientAPStatus(channel_id: str, ap_id: str, user_id: str) -> None:
    ap = AccessPointLocation.objects.get(uuid=ap_id, owner=user_id)
    ap_coverage = AccessPointCoverageBuildings.objects.get(ap=ap)
    sendMessageToChannel(
        channel_id,
        {"type": "ap.status", "status": ap_coverage.status, "uuid": str(ap.uuid)}
    )
