# Generated by Django 3.1.6 on 2021-03-25 01:04
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('IspToolboxApp', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='BuildingDetection',
        ),
        migrations.DeleteModel(
            name='Tl2019UsCounty',
        ),
        migrations.DeleteModel(
            name='Tl2019UsZcta510',
        ),
    ]
