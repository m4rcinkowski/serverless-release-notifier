import type { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
    service: 'release-notifier',
    frameworkVersion: '2',
    custom: {
        stage: '${opt:stage, self:provider.stage}',
        webpack: {
            webpackConfig: './webpack.config.js',
            includeModules: true,
        },
        apiGatewayServiceProxies: [
            {
                dynamodb: {
                    path: '/releases/{ReleaseId}',
                    method: 'put',
                    tableName: {
                        Ref: 'ReleasesTable',
                    },
                    hashKey: {
                        pathParam: 'ReleaseId',
                        attributeType: 'S',
                    },
                    action: 'PutItem',
                    condition: 'attribute_not_exists(ReleaseId)',
                    cors: false,
                },
            },
        ],
        dotenv: {
            required: {
                env: [
                    'WEBHOOK_URL'
                ],
            },
        },
    },
    // Add the serverless-webpack plugin
    plugins: ['serverless-webpack', 'serverless-apigateway-service-proxy', 'serverless-dotenv-plugin'],
    provider: {
        name: 'aws',
        runtime: 'nodejs12.x',
        region: 'us-east-1',
        apiGateway: {
            minimumCompressionSize: 1024,
            shouldStartNameWithService: true,
        },
        environment: {
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
        tracing: {
            apiGateway: true,
            lambda: true
        }
    },
    functions: {
        handleNewRelease: {
            handler: 'handler.onNewRelease',
            events: [
                {
                    stream: {
                        type: 'dynamodb',
                        arn: {
                            'Fn::GetAtt': ['ReleasesTable', 'StreamArn'],
                        },
                    },
                },
            ],

        },
    },
    resources: {
        Resources: {
            ReleasesTable: {
                Type: 'AWS::DynamoDB::Table',
                Properties: {
                    TableName: '${self:service}-${self:custom.stage}-releases',
                    AttributeDefinitions: [
                        {
                            AttributeName: 'ReleaseId',
                            AttributeType: 'S',
                        },
                    ],
                    KeySchema: [
                        {
                            AttributeName: 'ReleaseId',
                            KeyType: 'HASH',
                        },
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 1,
                        WriteCapacityUnits: 1,
                    },
                    TimeToLiveSpecification: {
                        AttributeName: 'LockedUntil',
                        Enabled: true,
                    },
                    StreamSpecification: {
                        StreamViewType: 'NEW_IMAGE',
                    },
                },
            },
        },
    },
};

module.exports = serverlessConfiguration;
