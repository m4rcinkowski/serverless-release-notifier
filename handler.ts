import { DynamoDBStreamHandler } from 'aws-lambda';
import 'source-map-support/register';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as AWSXRay from 'aws-xray-sdk';
import * as https from 'https';
import * as assert from 'assert';

const webhookUrl = process.env.WEBHOOK_URL;
assert.ok(webhookUrl, 'WEBHOOK_URL is not in env vars');
const httpClient = AWSXRay.captureHTTPs(https, true);

function postToWebhook(attributes: { [p: string]: any }) {
    const webhookRequest = httpClient.request(webhookUrl, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
    }, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });
    webhookRequest.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    webhookRequest.write(JSON.stringify({
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Release \`${attributes.ReleaseId}\` has reached the production`,
                },
            },
        ],
    }));
    webhookRequest.end();
}

export const onNewRelease: DynamoDBStreamHandler = async (event, _context) => {
    console.debug(`Received ${event.Records.length} event(s)`);

    event.Records.filter((record) => record.eventName === 'INSERT').forEach((record) => {
        const attributes = Converter.unmarshall(record.dynamodb.NewImage);

        console.log('Processing new table item', attributes);
        postToWebhook(attributes);
    });
};
