const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');

const s3Client = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = "html-to-pdf-gavoor234";


const DbConfiguration = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};


module.exports.processCsvApi = async (event) => {
    try {
        const { filename } = JSON.parse(event.body); 

        if (!filename) {
            return { statusCode: 400, body: JSON.stringify({ message: "Filename is required" }) };
        }

        return await processCsvFromS3(filename);

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// Function to Process CSV from S3
async function processCsvFromS3(filename) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: filename });
    const response = await s3Client.send(command);

    // Convert Stream to String
    const csvData = await streamToString(response.Body);

    // Parse CSV
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    if (!records.length) throw new Error("CSV file is empty");

    let connection;
    try {
        // Connect to MySQL
        connection = await mysql.createConnection(DbConfiguration);

        const tableName = "products";  // Your table name
        const columns = Object.keys(records[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Insert records
        for (const record of records) {
            const values = columns.map(col => record[col]);
            await connection.execute(query, values);
        }

        return { statusCode: 200, body: JSON.stringify({ message: "CSV Processed Successfully" }) };

    } finally {
        if (connection) await connection.end();
    }
}


const streamToString = (stream) => {
    return new Promise((resolve, reject) => {
        let data = '';
        stream.on('data', (chunk) => { data += chunk; });
        stream.on('end', () => resolve(data));
        stream.on('error', (err) => reject(err));
    });
};