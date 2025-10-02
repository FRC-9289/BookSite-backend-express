const express = require('express');
const app = express();
require('./db/db'); // MongoDB connection

app.use(express.json());

const userRoutes = require('./routes/users');
app.use('/', require('./routes/index'));
app.use('/users', userRoutes);

const server = app.listen(8000, () => {
  const port = server.address().port; // get actual port
  console.log(`Server running on http://localhost:${port}`);
});
