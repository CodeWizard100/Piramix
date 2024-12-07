const express = require('express');
const cors = require('cors'); // Import CORS package
const bodyParser = require('body-parser');
const axios = require('axios');
const { Buffer } = require('buffer'); // Import Buffer for Base64 encoding/decoding
const app = express(); // Create an instance of an Express app
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON bodies

// Handle GET requests to the root URL
app.get('/', (req, res) => {
  res.send(`${process.env.link}`); // Correct use of template literal
});

// Handle new account creation with Base64 encoding for the password
app.post('/newaccount', async (req, res) => {
    const { username, password, appid } = req.body;

    try {
        // Check if the user already exists
        const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);

        // If response data is not null, it means the user already exists
        if (response.data !== null) {
            return res.status(400).json({ message: 'User already exists!' });
        }

        // Encode the password to Base64 before storing
        const encodedPassword = Buffer.from(password).toString('base64');

        // Register the new user with the encoded password
        const newUser = {
            password: encodedPassword
        };

        // Save the user data to Firebase
        await axios.put(`${process.env.link}/Apps/${appid}/Users/${username}.json`, newUser);

        return res.status(200).json({ message: 'User added successfully!' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding user!' });
    }
});

// Handle retrieving account data and decoding the password from Base64
app.post('/getaccount', async (req, res) => {
  const { username, appid } = req.body;

  try {
    // Send request to Firebase to get user data
    const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);
    
    // Check if the response data is empty or null
    if (!response.data || Object.keys(response.data).length === 0) {
      return res.status(400).json({ message: `${process.env.link}/Apps/${appid}/Users/${username}.json not found!` });
    }
    
    // Decode the Base64 encoded password
    const decodedPassword = Buffer.from(response.data.password, 'base64').toString('utf-8');

    // Omit other sensitive information and return the decoded password
    const { password, ...userDataWithoutPassword } = response.data;

    // Add the decoded password back to the response
    userDataWithoutPassword.password = decodedPassword;

    // Send the account data with the decoded password
    return res.status(200).json({ message: 'Account retrieved successfully!', jsoncontent: userDataWithoutPassword });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error while getting account!' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
