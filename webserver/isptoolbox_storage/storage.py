# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.conf import settings
from django.contrib.staticfiles.storage import ManifestFilesMixin
from storages.backends.s3boto3 import S3Boto3Storage
import json
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage


class LocalManifestFileMixin(ManifestFilesMixin):
    """
    ManifestFilesMixin child class

    This overrides the behavior that store the manifest in the normal storage and saves it
    with source code, avoid requesting manifest from S3

    - generates staticfiles.json
    """
    def __init__(self, *args, **kwargs):
        self.manifest_storage = FileSystemStorage(location=settings.BASE_DIR)
        super().__init__(*args, **kwargs)

    def read_manifest(self):
        try:
            with self.manifest_storage.open(self.manifest_name) as manifest:
                return manifest.read().decode()
        except FileNotFoundError:
            return None

    def save_manifest(self):
        payload = {'paths': self.hashed_files, 'version': self.manifest_version}
        if self.manifest_storage.exists(self.manifest_name):
            self.manifest_storage.delete(self.manifest_name)
        contents = json.dumps(payload, sort_keys=True, indent=4).encode()
        self._save(self.manifest_name, ContentFile(contents))
        self.manifest_storage._save(self.manifest_name, ContentFile(contents))


class S3ManifestStorage(LocalManifestFileMixin, S3Boto3Storage):
    """
    Storage Class that combines S3 storage with Manifest, this allows for pushing versioned static files
    (push safety) into S3, S3 then uses cloudfront as a CDN to reduce load times.

    Based on PR: https://github.com/django/django/pull/12187/
    """
    pass
