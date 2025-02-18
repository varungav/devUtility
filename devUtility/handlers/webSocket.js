const { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const dbClient = new DynamoDBClient({ region: "us-east-1" });
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;

module.exports.connect = async (event) => {
    const connectionId = event.requestContext.connectionId;

    const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: { ConnectionId: { S: connectionId } }, 
    });

    try {
        await dbClient.send(command);
        return { statusCode: 200, body: "Connected" };
    } catch (error) {
        console.error("DynamoDB PutItem Error:", error);
        return { statusCode: 500, body: "Error connecting" };
    }
};

module.exports.disconnect = async (event) => {
    const connectionId = event.requestContext.connectionId;

    const command = new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: {
            ConnectionId: { S: connectionId } 
        },
    });

    try {
        await dbClient.send(command);
        return { statusCode: 200, body: "Disconnected" };
    } catch (error) {
        console.error("DynamoDB DeleteItem Error:", error);
        return { statusCode: 500, body: "Error disconnecting" };
    }
};

module.exports.message = async (event) => {
    const { message } = JSON.parse(event.body);
    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    const apiClient = new ApiGatewayManagementApiClient({ endpoint });

    try {
        const connections = await dbClient.send(new ScanCommand({ TableName: TABLE_NAME }));

        if (!connections.Items || connections.Items.length === 0) {
            console.log("No active WebSocket connections.");
            return { statusCode: 200, body: "No connections to send messages to." };
        }

        const postPromises = connections.Items.map(({ ConnectionId }) => {
            const postCommand = new PostToConnectionCommand({
                ConnectionId: ConnectionId.S,
                Data: Buffer.from(JSON.stringify({ message })),
            });
            return apiClient.send(postCommand).catch(err => console.log("Error sending message:", err));
        });

        await Promise.all(postPromises);

        return { statusCode: 200, body: "Message sent" };
    } catch (error) {
        console.error("Error in message broadcast:", error);
        return { statusCode: 500, body: "Error broadcasting message" };
    }
};
