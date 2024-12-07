const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto'); // Import crypto for encryption/decryption
const app = express();
const port = process.env.PORT || 3000;

// Encryption configuration
const algorithm = 'aes-256-cbc';
const secretKey = process.env.SECRET_KEY || crypto.randomBytes(32).toString('hex'); // Ensure this key is securely stored
const iv = crypto.randomBytes(16); // Initialization vector

// Function to encrypt a password
function encryptPassword(password) {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
    };
}

// Function to decrypt a password
function decryptPassword(encryptedData, ivHex) {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON bodies

// Handle GET requests to the root URL
app.get('/', (req, res) => {
    res.send(`${process.env.link}`); // Correct use of template literal
});

// Handle new account creation with encryption for the password
app.post('/newaccount', async (req, res) => {
    const { username, password, appid } = req.body;

    try {
        // Check if the user already exists
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);

        // If response data is not null, it means the user already exists
        if (response.data !== null) {
            return res.status(400).json({ message: 'User already exists!' });
        }

        // Encrypt the password before storing
        const encryptedPassword = encryptPassword(password);

        // Register the new user with the encrypted password
        const newUser = {
            password: encryptedPassword.encryptedData,
            iv: encryptedPassword.iv
        };

        // Save the user data to Firebase
        await axios.put(`${process.env.link}/Apps/${appid}/Users/${username}.json`, newUser);

        return res.status(200).json({ message: 'User added successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding user!' });
    }
});

// Handle retrieving account data and decrypting the password
app.post('/getaccount', async (req, res) => {
    const { username, appid } = req.body;

    try {
        // Send request to Firebase to get user data
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);

        // Check if the response data is empty or null
        if (!response.data || Object.keys(response.data).length === 0) {
            return res.status(400).json({ message: `${process.env.link}/Apps/${appid}/Users/${username}.json not found!` });
        }

        // Remove sensitive information like password and IV
        const { password, iv, ...userDataWithoutSensitiveInfo } = response.data;

        // Send the sanitized account data
        return res.status(200).json({
            message: 'Account retrieved successfully!',
            jsoncontent: userDataWithoutSensitiveInfo
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error while getting account!' });
    }
});

// Handle password verification
app.post('/iscorrectpassword', async (req, res) => {
    const { username, password, appid } = req.body;

    try {
        // Retrieve the user's encrypted password and IV from Firebase
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);

        if (!response.data || Object.keys(response.data).length === 0) {
            return res.status(400).json({ message: 'User not found!' });
        }

        // Decrypt the stored password
        const decryptedPassword = decryptPassword(response.data.password, response.data.iv);

        // Compare the provided password with the decrypted one
        if (decryptedPassword === password) {
            return res.status(200).json({ message: 'Password is correct!' });
        } else {
            return res.status(400).json({ message: 'Password is incorrect!' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error verifying password!' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
