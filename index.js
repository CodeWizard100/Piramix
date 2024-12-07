const express = require('express');
const cors = require('cors'); // Import CORS package
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express(); // Create an instance of an Express app
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON bodies

// Handle GET requests to the root URL
app.get('/', (req, res) => {
  res.send(`${process.env.link}`); // Correct use of template literal
});

app.post('/getaccount', async (req, res) => {
  const { username, appid } = req.body;

  try {
    // Send request to Firebase
    const response = await axios.get(`${process.env.link}/Apps/${appid}/Users/${username}.json`);
    
    // Check if the response data is empty or null
    if (!response.data || Object.keys(response.data).length === 0) {
      return res.status(400).json({ message: `${process.env.link}/Apps/${appid}/Users/${username}.json not found!` });
    }
    
    // Send account data
    const jsoncontent = response.data;
    return res.status(200).json({ message: 'Account retrieved successfully!', jsoncontent });
    
  } catch (error) {
    // Handle errors
    console.error(error);
    return res.status(500).json({ message: 'Error While Getting Account!' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
