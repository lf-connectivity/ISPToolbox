# Generated by Django 3.1.14 on 2022-03-02 19:41

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0094_workspacemapsession_area_number'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='accesspointcoveragebuildings',
            name='nearby_buildings',
        ),
    ]
