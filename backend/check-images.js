const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://parthhkdigiverse1_db_user:root123@cluster0.sgepsbi.mongodb.net/vwc_db?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    const db = client.db("vwc_db");

    const imagesCount = await db.collection("product_images").countDocuments({});
    console.log("Total product images in DB:", imagesCount);

    const images = await db.collection("product_images").find({}).project({ id: 1, productId: 1, is_primary: 1, qdrant_vector_id: 1, vector: 1 }).toArray();
    console.log("Image records:");
    console.log(images.map(img => ({
      ...img,
      vectorLength: img.vector ? img.vector.length : 0,
      vector: undefined
    })));

    const productsCount = await db.collection("products").countDocuments({});
    console.log("Total products in DB:", productsCount);
    const products = await db.collection("products").find({}).toArray();
    console.log("Product records:");
    console.log(products);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
