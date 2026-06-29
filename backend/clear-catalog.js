const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://parthhkdigiverse1_db_user:root123@cluster0.sgepsbi.mongodb.net/vwc_db?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    const db = client.db("vwc_db");

    const deleteImages = await db.collection("product_images").deleteMany({});
    console.log("Deleted product images:", deleteImages.deletedCount);

    const deleteProducts = await db.collection("products").deleteMany({});
    console.log("Deleted products:", deleteProducts.deletedCount);

    const deleteHistory = await db.collection("search_history").deleteMany({});
    console.log("Deleted search history:", deleteHistory.deletedCount);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
