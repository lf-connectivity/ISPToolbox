# (c) Meta Platforms, Inc. and affiliates. Copyright
from uuid import UUID
from celery_async import celery_app as app
from workspace.models import AccessInformationJob, DeleteInformationJob
import tempfile
from django.core import serializers
from django.contrib.admin.utils import NestedObjects
from django.db import DEFAULT_DB_ALIAS


@app.task
def createUserDataDownload(job_id: UUID):
    job = AccessInformationJob.objects.get(id=job_id)
    # Get User
    user = job.owner

    # Collect All Related Models
    collector = NestedObjects(using=DEFAULT_DB_ALIAS)
    collector.collect([user])
    data_dump = serializers.serialize('json',  map(
        lambda item: item[1], collector.instances_with_model()))

    # Finally, write to temporary file and upload
    with tempfile.TemporaryFile() as tmp_fp:
        tmp_fp.write(data_dump.encode('utf-8'))
        job.data_dump.save(
            f'{job.owner.first_name}_{job.owner.last_name}.json', tmp_fp)


@app.task
def deleteUser(job_id: UUID):
    job = DeleteInformationJob.objects.get(id=job_id)
    # Get User
    user = job.user
    # Delete User - will trigger cascades
    user.delete()
