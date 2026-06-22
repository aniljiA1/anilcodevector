require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "codevector";

const CATEGORIES = [
  "Electronics",
  "Home & Kitchen",
  "Clothing",
  "Books",
  "Sports & Outdoors",
  "Toys & Games",
  "Beauty & Personal Care",
  "Automotive",
  "Grocery",
  "Office Supplies",
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const products = db.collection("products");

  console.log("Inserting 50 brand-new products (created_at = now)...");
  const now = new Date();
  const inserts = Array.from({ length: 50 }, (_, i) => ({
    name: `Just Added Product #${i}`,
    category: CATEGORIES[i % CATEGORIES.length],
    price: Math.round((10 + Math.random() * 500) * 100) / 100,
    created_at: now,
    updated_at: now,
  }));
  await products.insertMany(inserts);

  console.log(
    "Updating 50 random existing products (price + updated_at only)...",
  );
  const sample = await products
    .aggregate([{ $sample: { size: 50 } }])
    .toArray();
  for (const doc of sample) {
    await products.updateOne(
      { _id: doc._id },
      {
        $set: {
          price: Math.round((10 + Math.random() * 500) * 100) / 100,
          updated_at: new Date(),
        },
      },
    );
  }

  console.log(
    "Done. 50 inserted, 50 updated. created_at of updated docs was left untouched.",
  );
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
