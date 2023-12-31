# Generated by Django 3.1.13 on 2021-12-15 22:10
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('IspToolboxAccounts', '0016_pagevisit'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagevisit',
            name='ip',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pagevisit',
            name='response_code',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
