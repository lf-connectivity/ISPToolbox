# Generated by Django 3.1.14 on 2022-04-01 18:23
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0099_asynctaskapimodel'),
    ]

    operations = [
        migrations.DeleteModel(
            name='AsyncTaskAPIModel',
        ),
    ]
