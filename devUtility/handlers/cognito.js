const { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, AdminUpdateUserAttributesCommand, AdminInitiateAuthCommand, AdminRespondToAuthChallengeResponseFilterSensitiveLog, ChallengeResponse, ResendConfirmationCodeCommand } = require("@aws-sdk/client-cognito-identity-provider");

const crypto = require("crypto");


const client = new CognitoIdentityProviderClient({ region: "us-east-1" });
const ClientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const UserPoolId = process.env.USER_POOL_ID;

function generateSecretHash(username, clientId, clientSecret) {
    if (!clientSecret) return undefined;
    return crypto.createHmac("sha256", clientSecret).update(username + clientId).digest("base64");
}

module.exports.signUp = async (event) => {
    try {
        const { username, password, email, phone, birthdate, formattedName } = JSON.parse(event.body);

        const secretHash = generateSecretHash(username, ClientId, clientSecret);

        const command = new SignUpCommand({
            ClientId,
            Username: username,
            Password: password,
            SecretHash: secretHash,
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "phone_number", Value: phone },
                { Name: "birthdate", Value: birthdate },
                { Name: "name", Value: formattedName },
            ],
        });

        await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User Signed Up Successfully!" }),
        };
    } catch (Err) {
        console.error("Unexpected error: ", Err);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: Err.message }),
        };
    }
};

module.exports.confirmUser = async (event) => {
    try {
        const { username, confirmationCode } = JSON.parse(event.body);
        const secretHash = generateSecretHash(username, ClientId, clientSecret);

        const confirmCommand = new ConfirmSignUpCommand({
            ClientId,
            Username: username,
            ConfirmationCode: confirmationCode,
            ...(secretHash && { SecretHash: secretHash }),
        });

        await client.send(confirmCommand);

        const updateCommand = new AdminUpdateUserAttributesCommand({
            UserPoolId,
            Username: username,
            UserAttributes: [{ Name: "email_verified", Value: "true" }],
        });

        await client.send(updateCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email verified successfully!" }),
        };
    } catch (err) {
        console.error("Error: ", err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: err.message }),
        };
    }
};

module.exports.signIn = async (event) => {
    try {
        const { username, password } = JSON.parse(event.body);

        const secretHash = generateSecretHash(username, ClientId, clientSecret);

        const command = new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                ...(secretHash && { SECRET_HASH: secretHash }),
            },
        });

        const response = await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "User authenticated successfully!",
                tokens: {
                    IdToken: response.AuthenticationResult.IdToken,
                    AccessToken: response.AuthenticationResult.AccessToken,
                    RefreshToken: response.AuthenticationResult.RefreshToken,
                },
            }),
        };
    } catch (err) {
        console.error("Error: ", err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: err.message }),
        };
    }
};

module.exports.resendOtp = async(event) => {
    try {
        const username = JSON.parse(event.body);
        const command = new ResendConfirmationCodeCommand({
            ClientId: process.env.CLIENT_ID,
            Username: username,
        });
    
        await client.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "OTP Sent successfully."
            })
        }
    } catch(Err) {
        console.log("Error sending the otp", Err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to Send OTP" || Err.message
            })
        }
    }
}

// module.exports.initiateAuth = async (event) => {
//     try {
//         const { username } = JSON.parse(event.body);

//         console.log("Initiating auth for:", username);
//         console.log("ClientId:", ClientId);
//         console.log("UserPoolId:", UserPoolId);

//         const command = new AdminInitiateAuthCommand({
//             UserPoolId,
//             ClientId,
//             AuthFlow: "CUSTOM_AUTH", // Ensure this is correct
//             AuthParameters: {
//                 USERNAME: username,
//                 SECRET_HASH: generateSecretHash(username, ClientId, clientSecret), // Add secret hash
//             },
//         });

//         const response = await client.send(command);

//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 session: response.Session,
//                 message: "OTP sent to your mail-id",
//             }),
//         };
//     } catch (err) {
//         console.error("Error Initiating Auth:", err);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: err.message, details: err }),
//         };
//     }
// };


module.exports.verifyOtp = async (event) => {
    try {
        const { username, otp, session } = JSON.parse(event.body); // Extract parameters from request body

        const command = new AdminRespondToAuthChallengeCommand({
            UserPoolId,
            ClientId,
            ChallengeName: "CUSTOM_CHALLENGE",
            ChallengeResponses: {
                USERNAME: username,
                ANSWER: otp,
            },
            Session: session,
        });

        const response = await client.send(command);

        return response.AuthenticationResult
            ? {
                  statusCode: 200,
                  body: JSON.stringify({
                      success: true,
                      message: "User verified successfully",
                      tokens: {
                          IdToken: response.AuthenticationResult.IdToken,
                          AccessToken: response.AuthenticationResult.AccessToken,
                          RefreshToken: response.AuthenticationResult.RefreshToken,
                      },
                  }),
              }
            : {
                  statusCode: 400,
                  body: JSON.stringify({ success: false, message: "OTP verification failed" }),
              };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid OTP or verification failed." }),
        };
    }
};
