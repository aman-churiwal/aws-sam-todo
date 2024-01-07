import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';

const schema = Joi.object({
    name: Joi.string().required(),
});

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const TODO_TABLE = process.env.TODO_TABLE;

export const createHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log(JSON.stringify(event));

        const { body, requestContext } = event;
        const { authorizer } = requestContext;
        const { claims } = authorizer || {};
        const { ['cognito:username']: username } = claims || {};

        if (!body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Body is required',
                }),
            };
        }

        const parsedBody = JSON.parse(body);
        const { value, error } = schema.validate(parsedBody);

        if (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Error',
                    error,
                }),
            };
        }

        const payload = {
            ...value,
            id: new Date().valueOf().toString(),
            username,
        };

        await docClient.send(
            new PutCommand({
                TableName: TODO_TABLE,
                Item: payload,
            }),
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                todo: payload,
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
