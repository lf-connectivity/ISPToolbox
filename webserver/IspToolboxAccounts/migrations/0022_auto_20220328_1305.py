# Generated by Django 3.1.14 on 2022-03-28 20:05
# (c) Meta Platforms, Inc. and affiliates. Copyright

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('IspToolboxAccounts', '0021_isptoolboxusersignupinfo_contact_me'),
    ]

    operations = [
        migrations.AlterField(
            model_name='isptoolboxusersignupinfo',
            name='contact_me',
            field=models.BooleanField(default=True),
        ),
    ]
