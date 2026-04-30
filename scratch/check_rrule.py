try:
    from dateutil.rrule import rrule, DAILY
    print("SUCCESS: dateutil is installed")
except ImportError:
    print("FAILURE: dateutil is not installed")
