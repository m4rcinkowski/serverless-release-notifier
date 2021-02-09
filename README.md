Release notifier
===

**The problem:**  
You deploy your app, either manually or through CI/CD pipeline, and need to wait for new hosts/containers to be set up, for the app to rise. So you wait, because the client or your team (QA engineer for example) waits for the confirmation that the new version is out.

**The solution:**  
Simple HTTP request sent just before your app starts will result in a notification on e.g. Slack channel.

# Features

* runnable via simple HTTP request (e.g. one-line `curl` command in your scripts)
* suitable for multi-host environments - only the first host will trigger the notification
* can be authorized by a fixed header value (TODO)
* flexible - can be used with any notification webhook (TODO)

The solution is cost-effective and will not produce additional costs when not used (which would be most of the time).

# Usage

## Deployment

TODO

## Triggering a release event

Given that you hold you application version or release id in a variable, e.g. `CI_JOB_ID="api-2.50.1""` use below curl command to send a request:

```shell
EXP_TIME=$(date -d '+1 hour' +%s)
NOTIFICATION_URL='https://vqdmg7tn7k.execute-api.eu-west-1.amazonaws.com/dev'

curl -XPUT $NOTIFICATION_URL/releases/$CI_JOB_ID -d '{"LockedUntil": {"N":'$EXP_TIME'}}' -H 'Content-Type: application/json'
```

Any request after the first one, will result in a response code 400 with a response indicating a _conditional check failure_.  
That is - within the expiration (lock) time you've provided. Remember that your release will not be unlocked immediately after the expiration time. DynamoDB allows itself to wait up to 48 hours to delete expired items - you've been warned, although in normal usage it should not be an issue.
