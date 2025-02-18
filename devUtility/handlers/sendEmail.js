const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = new SESClient({ region: "us-east-1" });

module.exports.sendEmail = async (event) => {
    try {
        const { to, from, subject, text } = JSON.parse(event.body);
        if (!to || !from || !subject || !text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "To, From, Subject, and Text fields are required." }),
            };
        }

        const params = {
            Destination: { ToAddresses: [to] },
            Source: from,
            Message: {
                Subject: { Data: subject },
                Body: { Text: { Data: text } },
            },
        };

        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Mail sent successfully to ${to}`, MessageId: response.MessageId }),
        };

    } catch (err) {
        console.error("Error sending email: ", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to send email", details: err.message }),
        };
    }
};
