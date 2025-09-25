const express = require('express');
const app = express();
require('./db'); // MongoDB connection

app.use(express.json());

const userRoutes = require('./routes/users');
app.use('/users', userRoutes);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
