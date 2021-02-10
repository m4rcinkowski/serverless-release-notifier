import { DynamoDBStreamHandler } from 'aws-lambda';
import 'source-map-support/register';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as AWSXRay from 'aws-xray-sdk';
import * as https from 'https';
import * as assert from 'assert';

const webhookUrl = process.env.WEBHOOK_URL;
assert.ok(webhookUrl, 'WEBHOOK_URL is not in env vars');
const httpClient = AWSXRay.captureHTTPs(https, true);

type ReleaseAttributes = {
    ReleaseId: string,
    LockedUntil?: number,
    Environment?: string,
};

async function postToWebhook(attributes: ReleaseAttributes): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const environment = attributes.Environment || 'the destination';

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
                        text: `Release \`${attributes.ReleaseId}\` has reached ${environment}`,
                    },
                },
            ],
        }));
        webhookRequest.end();
    });
}

export const onNewRelease: DynamoDBStreamHandler = async (event, _context) => {
    const newRecords = event.Records.filter((record) => record.eventName === 'INSERT')
        .map(record => record.dynamodb.NewImage);
    console.debug(`Received ${event.Records.length} event(s), ${newRecords.length} of which are INSERTs`);

    for (const eventRecord of newRecords) {
        const attributes = Converter.unmarshall(eventRecord) as ReleaseAttributes;

        console.log('Processing new table item', attributes);
        await postToWebhook(attributes);
    }
};
