// db.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URL;
if (!uri) {
  throw new Error("MONGO_URL must be set in environment variables");
}

let client = null;
let db = null;

export async function initStudentDB() {
  if (db) {
    // Return existing connection if available
    return db;
  }

  client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    connectTimeoutMS: 30000,
  });

  await client.connect();
  db = client.db("students");
  console.log("✅ Connected to MongoDB:", uri);
  return db;
}

export async function closeDB() {
  if (client && client.topology && client.topology.isConnected()) {
    await client.close();
    db = null;
    console.log("MongoDB connection closed");
  }
}
