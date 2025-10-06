// dbFunctions.js
import { MongoClient } from "mongodb";

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

export async function findUserByEmail(email) {
  try {
    await client.connect();
    const db = client.db("students");
    const collection = db.collection("submissions");

    const student = await collection.findOne({ email });
    return student;
  } catch (err) {
    console.error("Error fetching student:", err);
    return null;
  } finally {
    await client.close();
  }
}
