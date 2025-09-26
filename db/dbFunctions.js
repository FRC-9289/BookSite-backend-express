const { connectToDB } = require('./db');

/**
 * List all collections in the database
 * @param {string} dbName
 */
async function listCollections(dbName) {
  const db = await connectToDB(dbName);
  const collections = await db.listCollections().toArray();
  console.log("Collections:");
  for (const col of collections) {
    console.log(col.name);
  }
}

/**
 * Fetch all documents from a collection
 * @param {string} dbName
 * @param {string} collectionName
 * @returns {Promise<Array>}
 */
async function getAllDocuments(dbName, collectionName) {
  const db = await connectToDB(dbName);
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).toArray();
  return documents;
}

/**
 * Insert one or more documents into a collection
 * @param {string} dbName
 * @param {string} collectionName
 * @param {Array|Object} docs
 */
async function insertDocuments(dbName, collectionName, docs) {
  const db = await connectToDB(dbName);
  const collection = db.collection(collectionName);
  if (Array.isArray(docs)) {
    await collection.insertMany(docs);
  } else {
    await collection.insertOne(docs);
  }
  console.log(`Inserted into ${collectionName}`);
}

module.exports = { listCollections, getAllDocuments, insertDocuments };
