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

Create a file named `.env.local` (you can use already existing `.env` for reference), and pass a _WEBHOOK_URL_.

## Deployment

After cloning the repository, install all the dependencies (`npm i`) and run:

```shell
npx sls deploy
```

In case of a need for customization, use `npx sls help` for additional parameters.

## Triggering a release event

All you need to trigger an event is to send an HTTP request with at least below body:

```json
{
  "LockedUntil": {"N": 1122334455}
}
```

`LockedUntil` is optional, though highly recommended. Providing it with a numeric timestamp (UNIX epoch time in seconds) enables DynamoDB to remove this record (release entry) from the table somewhere after that time. Think about it as garbage collecting.

### Practical example

Given that you hold you application version or release id in a variable, e.g. `CI_JOB_ID="api-2.50.1""` use below curl command to send a request:

```shell
EXP_TIME=$(date -d '+1 hour' +%s)
NOTIFICATION_URL='https://vqdmg7tn7k.execute-api.eu-west-1.amazonaws.com/dev'

curl -XPUT $NOTIFICATION_URL/releases/$CI_JOB_ID \
  -d '{"LockedUntil": {"N":'$EXP_TIME'}}' \
  -H 'Content-Type: application/json' \
  -s -o /dev/null
```

Any request after the first one, will result in a response code 400 with a response indicating a _conditional check failure_.  
That is - within the expiration (lock) time you've provided. Remember that your release will not be unlocked immediately after the expiration time. DynamoDB allows itself to wait up to 48 hours to delete expired items - you've been warned, although in a generic case it should not be an issue.

### Slightly more advanced example

```json
{
  "LockedUntil": {"N": 1122334455},
  "Environment": {"S": "production"},
  "MessageTemplate": {"S": "Yo! Check out the ${Environment}, 'cause ${ReleaseId} has just landed there!"}
}
```
