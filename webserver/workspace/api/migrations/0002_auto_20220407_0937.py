# Generated by Django 3.1.14 on 2022-04-07 16:37
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('workspace', '0102_delete_asynctaskapimodel'),
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DummyTaskModel',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('sleep_length', models.PositiveIntegerField()),
                ('number_of_sectors', models.PositiveIntegerField(blank=True, default=None, null=True)),
                ('sleep_response', models.CharField(blank=True, default=None, max_length=128, null=True)),
                ('ap', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='workspace.accesspointlocation')),
                ('owner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.DeleteModel(
            name='AsyncTaskAPIModel',
        ),
    ]
