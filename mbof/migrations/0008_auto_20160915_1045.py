# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-09-15 14:45
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mbof', '0007_auto_20160817_1142'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='owner',
            field=models.CharField(editable=False, max_length=8),
        ),
        migrations.AlterField(
            model_name='intention',
            name='respondent',
            field=models.CharField(editable=False, max_length=8),
        ),
        migrations.AlterField(
            model_name='vote',
            name='voter',
            field=models.CharField(editable=False, max_length=8),
        ),
    ]
