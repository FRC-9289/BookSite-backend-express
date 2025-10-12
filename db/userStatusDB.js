const { client } = require("./db");
const { ObjectId } = require("mongodb");

async function getUsersCollection() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
  const db = client.db("BookSite");
  return db.collection("users");
}

async function updateUserStatus(userId, status) {
  const users = await getUsersCollection();

  const result = await users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { status } }
  );

  return result;
}

async function getUserById(userId) {
  const users = await getUsersCollection();
  return users.findOne({ _id: new ObjectId(userId) });
}

module.exports = { updateUserStatus, getUserById };