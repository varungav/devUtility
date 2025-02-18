const { SQSClient, SendMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({region: "us-east-1"});
const queue_url = process.env.QUEUE_URL;

module.exports.produceJob = async(event) => {
    console.log("This is the Queue Url: ", queue_url);
    try {
        if(!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Request body is missing"
                }),
            }
        }
        const body = JSON.parse(event.body);
        const jobMessage = {
        task: body.task || "default-task",
        userId: body.userId || "unknown-user",
        }
        const command = new SendMessageCommand({
        QueueUrl: queue_url,
        MessageBody: JSON.stringify(jobMessage),
        });
        
        console.log("Sending message to SQS:", JSON.stringify(jobMessage, null, 2));


        await sqsClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({message: "Job added to queue"})
        };
    } catch(err) {
        console.error("Error sending message to SQS: ", err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: `Failed to send Send a job: ${err.message}`, })
        };
    }
};

module.exports.processJob = async(event) => {
    for(const record of event.Records) {
        const jobData = JSON.parse(record.body);
        console.log("CUrrently processing the job: ", jobData);

        try {
            await new Promise((resolve) => setTimeout(resolve, 5000));

            console.log(`Successfully processed job for user: ${jobData.userId}`);

            // await sqsClient.send(new DeleteMessageCommand({
            //     QueueUrl: queue_url,
            //     ReceiptHandle: record.ReceiptHandle,
            // }));
        } catch(Err) {
            console.error("Error processing the job: ", Err);
            // Here we wont throw the error because the sqs must retry the same job until its done
        }
    }
    return { statusCode: 200, body: "Job processing complete" };
}