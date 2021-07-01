import { DynamoDBStreamHandler } from 'aws-lambda';
import 'source-map-support/register';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as AWSXRay from 'aws-xray-sdk';
import * as https from 'https';
import * as assert from 'assert';
import { WebClient } from '@slack/web-api';

const webhookUrl = process.env.WEBHOOK_URL;
assert.ok(webhookUrl, 'WEBHOOK_URL is not in env vars');
assert.ok(process.env.SLACK_API_CLIENT_TOKEN, 'SLACK_API_CLIENT_TOKEN is not in env vars');
const httpClient = AWSXRay.captureHTTPs(https, true);

type ReleaseAttributes = {
    __fileAttribute?: string,
    __fileName?: string,
    ReleaseId: string,
    LockedUntil?: number,
    MessageTemplate?: string,
};

const slackClient = new WebClient(process.env.SLACK_API_CLIENT_TOKEN);

const interpolate = (template: string, params: object) => {
    const names = Object.keys(params);
    const vals = Object.values(params);

    return new Function(...names, `return \`${template}\`;`)(...vals);
}

const buildMessage = (attributes: ReleaseAttributes): string => {
    const template = attributes.MessageTemplate || 'Release ${ReleaseId} has reached the destination';

    try {
        return interpolate(template, attributes);
    } catch (e) {
        console.error('Error on interpolating message template', {
            error: e,
            template,
            attributes,
        });
        throw e;
    }
};

async function postToWebhook(attributes: ReleaseAttributes): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let message;

        try {
            message = buildMessage(attributes);
        } catch (e) {
            reject();
        }

        const webhookRequest = httpClient.request(webhookUrl, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
        }, (res) => {
            res.on('end', () => {
                resolve();
            });
        });
        webhookRequest.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            reject();
        });
        webhookRequest.write(JSON.stringify({
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: message,
                    },
                },
            ],
        }));
        webhookRequest.end();
    });
}

async function postSnippet(attributes: ReleaseAttributes): Promise<void> {
    const content = attributes[attributes.__fileAttribute];
    const message = buildMessage(attributes);
    const filename = attributes.__fileName;

    const response = await slackClient.files.upload({
        content,
        channels: process.env.SLACK_CHANNELS,
        filename,
        initial_comment: message,
    });

    if (!response.ok) {
        console.log('Slack said: "not ok"', response);
    }
}

export const onNewRelease: DynamoDBStreamHandler = async (event, _context) => {
    const newRecords = event.Records.filter((record) => record.eventName === 'INSERT')
        .map(record => record.dynamodb.NewImage);
    console.debug(`Received ${event.Records.length} event(s), ${newRecords.length} of which are INSERTs`);

    for (const eventRecord of newRecords) {
        const attributes = Converter.unmarshall(eventRecord) as ReleaseAttributes;

        console.log('Processing new table item', attributes);

        try {
            if (attributes.__fileAttribute) {
                await postSnippet(attributes);
            } else {
                await postToWebhook(attributes);
            }
        } catch (e) {
            console.warn(e);
        }
    }
};
