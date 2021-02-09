import { DynamoDBStreamHandler } from 'aws-lambda';
import 'source-map-support/register';
import { Converter } from 'aws-sdk/clients/dynamodb';

export const onNewRelease: DynamoDBStreamHandler = async (event, _context) => {
    console.debug(`Received ${event.Records.length} event(s)`);

    event.Records.filter((record) => record.eventName === 'INSERT').forEach((record) => {
        const attributes = Converter.unmarshall(record.dynamodb.NewImage);

        console.log('Processing new table item', attributes);
    });
};
