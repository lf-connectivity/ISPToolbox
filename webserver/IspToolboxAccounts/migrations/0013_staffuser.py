# Generated by Django 3.1.13 on 2021-10-05 20:26
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('IspToolboxAccounts', '0012_merge_20210928_2344'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffUser',
            fields=[
            ],
            options={
                'verbose_name': 'Staff User',
                'verbose_name_plural': 'Staff Users',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('IspToolboxAccounts.user',),
        ),
    ]
