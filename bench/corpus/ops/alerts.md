# Alerts

## Consumer lag

The `consumer_lag` alert fires when a consumer group is more than
10,000 messages behind for 5 minutes. It pages the on-call engineer
through PagerDuty.

## Disk usage

The `disk_usage` alert fires at 85% of the data volume.
