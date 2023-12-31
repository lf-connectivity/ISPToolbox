# Generated by Django 3.1.6 on 2021-04-07 00:12
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.conf import settings
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('workspace', '0008_auto_20210401_2045'),
    ]

    operations = [
        migrations.CreateModel(
            name='MultiplayerSession',
            fields=[
                ('session_id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False, unique=True)),
                ('users', models.ManyToManyField(to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
