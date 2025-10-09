const { MongoClient } = require("mongodb");

const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(url, { useUnifiedTopology: true });

let db = null;

async function connectToDB(dbName) {
  if (db) return db;
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
}

async function closeDB() {
  if (client.isConnected()) {
    await client.close();
    db = null;
    console.log("MongoDB connection closed");
  }
}

module.exports = { connectToDB, closeDB, client };