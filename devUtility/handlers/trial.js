const { InitiateAuthCommand, CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");
const { error } = require("console");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const UserPoolId = process.env.USER_POOL_ID;


function generateSecretHash(clientId, clientSecret, username) {
    if(!clientSecret) return undefined;
    return crypto.createHmac("sha256", clientSecret)
            .update(username + clientId)
            .digest("base64");
}
 
const client = new CognitoIdentityProviderClient({region: "us-east-1"});
module.exports.handler = async(event) => {
    try {
        const { username, password } = JSON.parse(event.body);
        const secretHash = generateSecretHash(clientId, clientSecret, username);
    
        const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            clientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                ...(secretHash && { SECRET_HASH: secretHash }),
            }
        });
    
        const response = await client.send(command);
        if(!response.AuthenticationResult || !response.AuthenticationResult.IdToken) {
            return {
                statusCode: 401,
                body: JSON.stringify({message: "Authentication failed"})
            }
        }
        const idToken = response.AuthenticationResult.IdToken;
    
        // const token = idToken.split(" ");
        const decoded = jwt.decode(idToken, { complete: true});
    
        return {
            statusCode: 200,
            body: JSON.stringify({message: "Accessed the token.", user: decoded}),
        };
    }
        /* {
        This is the sample output how it will be shown
    "message": "Accessed the token.",
    "user": {
        "header": { "alg": "RS256", "typ": "JWT" },
        "payload": {
            "sub": "1234567890",
            "email": "testuser@example.com",
            "exp": 1712234567,
            "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example",
            "aud": "client_id_12345"
        }
    }
} */

    catch(Err) {
        console.log("Error Found: ", Err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error",
            error: error.message
             }),
        };
    }
};
