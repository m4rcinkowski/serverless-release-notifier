Release notifier
===

**The problem:**  
You deploy your app, either manually or through CI/CD pipeline, and need to wait for new hosts/containers to be set up, for the app to rise. So you wait, because the client or your team (QA engineer for particular) waits for the confirmation that new version is out.

**The solution:**  
Simple HTTP request sent just before your app starts will result in a notification on e.g. Slack channel.

# Features

* runnable via simple HTTP request (e.g. one-line `curl` command in your scripts)
* suitable for multi-host environments - only the first host will trigger the notification
* can be authorized by a fixed header value (TODO)
* flexible - can be used with any notification webhook (TODO)

The solution is cost-effective and will not produce additional costs when not used (which would be most of the time).

# Usage

TODO
