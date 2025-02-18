const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");

const S3 = new S3Client({ region: "us-east-1" });

module.exports.uploadDoc = async () => {
    try {
        const fileName = "test.png"; 
        const filePath = "test.png"; 

        
        const fileBuffer = fs.readFileSync(filePath);
        const buffer = Buffer.from(fileBuffer, 'base64');

        
        const params = {
            Bucket: "testuploadgavoor",
            Key: `uploads/${fileName}`,
            Body: buffer,
            ContentType: "image/png",
        };

        console.log("Uploading file with params:", params);

        
        await S3.send(new PutObjectCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "File uploaded successfully" }),
        };
    } catch (err) {
        console.error("Error uploading the document:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: err.message }),
        };
    }
};
