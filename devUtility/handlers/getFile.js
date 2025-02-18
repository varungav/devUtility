const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Joi = require("joi");

const S3 = new S3Client({ region: "us-east-1" });


const schema = Joi.object({
    fileName: Joi.string().required(),
});

module.exports.getFile = async (event) => {
    try {
        const body = event.queryStringParameters || {}; 

        const { value, error } = schema.validate(body);
        if (error) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: error.details[0].message }),
            };
        }
        console.log(value.fileName);
        const fileName = `uploads/${value.fileName}`
        const expireTime = 300;
        const bucketName = "testuploadgavoor";

        const command = new GetObjectCommand({ Bucket: bucketName, Key: fileName });

        const signedUrl = await getSignedUrl(S3, command, { expiresIn: expireTime });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signedUrl }),
        };
    } catch (err) {
        console.error("Error generating signed URL:", err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Internal Server Error", error: err.message }),
        };
    }
};
