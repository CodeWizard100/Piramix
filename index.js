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
    res.send('Hello'); // Correct use of template literal
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

app.post('/getallaccounts', async (req, res) => {
    const { appid } = req.body;

    try {
        // Send a request to Firebase to get all users under the specified app ID
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users.json`);

        // Check if the response data is empty or null
        if (!response.data || Object.keys(response.data).length === 0) {
            return res.status(400).json({ message: `No accounts found for app ID: ${appid}` });
        }

        // Sanitize user data by removing sensitive information
        const sanitizedUsernames = Object.entries(response.data).map(([username, userData]) => {
            // Simply return the username
            return username;
        });

        // Send the sanitized usernames as a table (array of strings)
        return res.status(200).json({
            message: 'All accounts retrieved successfully!',
            usernames: sanitizedUsernames
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error while getting all accounts!' });
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

// Add achievement to a user
app.post('/addachievement', async (req, res) => {
    const { user, key, achievementName, appid } = req.body;

    try {
        // Dynamically construct the expected environment variable name
        const expectedKey = process.env.KEY

        if (!expectedKey || key !== expectedKey) {
            return res.status(403).json({ message:'Invalid environment key!' });
        }

        const achievementData = {
            [achievementName]: true
        };

        await axios.put(`${process.env.link}/Apps/${appid}/Users/${user}/Achievements/${achievementName}.json`, achievementData);

        return res.status(200).json({ message: 'Achievement added successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding achievement!' });
    }
});

app.post('/adddatafield', async (req, res) => {
    const { username, key, fieldName, fieldValue, appid } = req.body;

    try {
        // Dynamically construct the expected environment variable name
        const expectedKey = process.env.KEY

        if (!expectedKey || key !== expectedKey) {
            return res.status(403).json({ message: 'Invalid environment key!' });
        }

        const newField = {
            [fieldName]: fieldValue
        };

        await axios.patch(`${process.env.link}/Apps/${appid}/Users/${username}/data.json`, newField);

        return res.status(200).json({ message: 'Data field added successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding data field!' });
    }
});

app.post('/setdatafield', async (req, res) => {
    const { username, key, fieldName, fieldValue, appid } = req.body;

    try {
        // Dynamically construct the expected environment variable name
        const expectedKey = process.env.KEY;

        if (!expectedKey || key !== expectedKey) {
            return res.status(403).json({ message: 'Invalid environment key!' });
        }

        const newField = {
            [fieldName]: fieldValue
        };

        await axios.put(`${process.env.link}/Apps/${appid}/Users/${username}/data.json`, newField);

        return res.status(200).json({ message: 'Data field set successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error setting data field!' });
    }
});

// Check if the user owns a specific achievement
app.post('/ownsachievement', async (req, res) => {
    const { user, achievementName, appid } = req.body;

    try {
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${user}/Achievements/${achievementName}/${achievementName}.json`);

        if (response.data === true) {
            return res.status(200).json({ message: 'User owns this achievement!' });
        } else {
            return res.status(400).json({ message: 'User does not own this achievement!' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error checking achievement ownership!' });
    }
});

// Get user data
app.post('/getdata', async (req, res) => {
    const { username, appid } = req.body;

    try {
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}/data.json`);

        if (!response.data) {
            return res.status(400).json({ message: 'Data not found!' });
        }

        return res.status(200).json({
            message: 'Data retrieved successfully!',
            jsoncontent: response.data
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error retrieving data!' });
    }
});



// Get fields from a save
app.post('/getsavefields', async (req, res) => {
    const { saveName, username, appid } = req.body;

    try {
        // Fetch the save fields from Firebase
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}/Saves/${saveName}.json`);

        // Check if data exists for the save
        if (!response.data || Object.keys(response.data).length === 0) {
            return res.status(400).json({ message: 'Save not found or has no fields!' });
        }

        // Return the save fields as JSON
        return res.status(200).json({
            message: 'Save fields retrieved successfully!',
            saveFields: response.data
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error retrieving save fields!' });
    }
});


// Create a new save
app.post('/newsave', async (req, res) => {
    const { saveName, username, appid } = req.body;

    try {
        const newSave = {};

        await axios.put(`${process.env.link}/Apps/${appid}/Users/${username}/Saves/${saveName}.json`, newSave);

        return res.status(200).json({ message: 'Save created successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error creating save!' });
    }
});

// Add field to save
app.post('/addsavefield', async (req, res) => {
    const { saveName, username, fieldName, fieldValue, key, appid } = req.body;

    try {
        // Use process.env.KEY instead of hardcoded key for validation
        if (key !== process.env.KEY) {
            return res.status(403).json({ message: 'Invalid environment key!' });
        }

        const newField = {
            [fieldName]: fieldValue
        };

        await axios.patch(`${process.env.link}/Apps/${appid}/Users/${username}/Saves/${saveName}.json`, newField);

        return res.status(200).json({ message: 'Save field added successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding save field!' });
    }
});

// Set save field
app.post('/setsavefield', async (req, res) => {
    const { saveName, username, fieldName, fieldValue, key, appid } = req.body;

    try {
        // Use process.env.KEY instead of hardcoded key for validation
        if (key !== process.env.KEY) {
            return res.status(403).json({ message: 'Invalid environment key!' });
        }

        const newField = {
            [fieldName]: fieldValue
        };

        await axios.put(`${process.env.link}/Apps/${appid}/Users/${username}/Saves/${saveName}.json`, newField);

        return res.status(200).json({ message: 'Save field set successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error setting save field!' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
