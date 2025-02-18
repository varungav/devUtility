const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { parse } = require('json2csv');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = "html-to-pdf-gavoor234";

const DbConfiguration = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

module.exports.handler = async (event) => {
    let connection;
    try {
        const { tablename, column, filter } = JSON.parse(event.body);
        
        if (!tablename) {
            return { statusCode: 400, body: JSON.stringify({ message: "Table Name is required." }) };
        }

        connection = await mysql.createConnection(DbConfiguration);

        let query = `SELECT ${column ? column.join(", ") : "*" } FROM ${tablename}`;

        if (filter) {
            const conditions = Object.entries(filter)
                .map(([key, value]) => `${key} = '${value}'`)
                .join(" AND ");
            query += ` WHERE ${conditions}`;
        }

        const [rows] = await connection.execute(query);
        if (!rows.length) throw new Error("No data found with the given details");

        const csv = parse(rows);
        const filename = `${tablename}-${Date.now()}.csv`;

        const uploadParams = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: csv,
            ContentType: 'text/csv'
        });

        await s3Client.send(uploadParams);
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: filename});
        const URL = await getSignedUrl(s3Client, command, { expiresIn: 300});

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "File Generated, and link is valid for 5 minutes",
                url: URL
            })
        };
    } catch (error) {
        console.log("Error Occurred: ", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    } finally {
        if (connection) await connection.end();
    }
};