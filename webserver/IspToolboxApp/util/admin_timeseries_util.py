# (c) Meta Platforms, Inc. and affiliates. Copyright
import datetime


def get_next_in_date_hierarchy(request, date_hierarchy):
    """
    Helper function that gets next smallest unit of time from url query string
    """
    if date_hierarchy + '__day' in request.GET:
        return 'hour'
    if date_hierarchy + '__month' in request.GET:
        return 'day'
    if date_hierarchy + '__year' in request.GET:
        return 'week'
    return 'month'


def get_request_datetime(request, date_hierarchy):
    day = request.GET.get(date_hierarchy + '__day', 1)
    month = request.GET.get(date_hierarchy + '__month', 1)
    year = request.GET.get(date_hierarchy + '__year', datetime.datetime.today().year)
    return datetime.date(year=int(year), month=int(month), day=int(day))


def daterange(starttime, endtime=None, time='day'):
    """
    Generate an iterator of dates between the two given dates.
    """
    import pandas as pd

    if time == 'hour':
        if endtime is None:
            endtime = datetime.timedelta(days=1) + starttime
        return pd.date_range(starttime, endtime, freq='H')
    if time == 'day':
        if endtime is None:
            endtime = datetime.timedelta(weeks=4) + starttime
        return pd.date_range(starttime, endtime, freq='D')
    if time == 'week':
        if endtime is None:
            endtime = datetime.timedelta(weeks=52) + starttime
        return pd.date_range(starttime, endtime, freq='W-MON')
    if time == 'month':
        if endtime is None:
            endtime = datetime.timedelta(weeks=104) + starttime
        return pd.date_range(starttime, endtime, freq='MS')
