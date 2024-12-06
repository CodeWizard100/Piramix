const express = require('express'); // Import Express
const app = express(); // Create an instance of an Express app
const port = 80; // HTTP usually runs on port 80

// Handle GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Yo!'); // Respond with "Yo!"
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
