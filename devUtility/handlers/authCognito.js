const jwt = require('jsonwebtoken');



module.exports.handler = async (event) => {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;

        if (!authHeader) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized: No token provided" }),
            };
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized: Malformed token" }),
            };
        }

        const decoded = jwt.decode(token, { complete: true });

        if (!decoded) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Invalid token" }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Protected data accessed!", user: decoded }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
