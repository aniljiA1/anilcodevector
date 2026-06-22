require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "codevector";

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 5000;

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

const ADJECTIVES = [
  "Premium",
  "Classic",
  "Compact",
  "Wireless",
  "Portable",
  "Eco-Friendly",
  "Heavy-Duty",
  "Smart",
  "Deluxe",
  "Lightweight",
  "Professional",
  "Vintage",
  "Modern",
  "Ultra",
  "Basic",
  "Advanced",
  "Durable",
  "Stylish",
];

const NOUNS = [
  "Blender",
  "Backpack",
  "Headphones",
  "Notebook",
  "Desk Lamp",
  "Water Bottle",
  "Running Shoes",
  "Sofa",
  "Camera",
  "Keyboard",
  "Monitor",
  "Jacket",
  "Watch",
  "Speaker",
  "Charger",
  "Helmet",
  "Tent",
  "Mug",
  "Chair",
  "Wallet",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice() {
  // price between 4.99 and 4999.99
  const value = 4.99 + Math.random() * 4995;
  return Math.round(value * 100) / 100;
}

// Spread created_at over the last ~2 years (730 days), in milliseconds.
const TWO_YEARS_MS = 730 * 24 * 60 * 60 * 1000;
const NOW = Date.now();

function randomCreatedAt() {
  const offset = Math.floor(Math.random() * TWO_YEARS_MS);
  return new Date(NOW - offset);
}

function buildProduct(i) {
  const createdAt = randomCreatedAt();
  return {
    _id: new ObjectId(),
    name: `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)} #${i}`,
    category: randomItem(CATEGORIES),
    price: randomPrice(),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function main() {
  console.log(`Connecting to ${MONGODB_URI} ...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const products = db.collection("products");

  const existing = await products.estimatedDocumentCount();
  if (existing > 0) {
    console.log(
      `Collection already has ${existing} documents. Dropping it for a clean seed...`,
    );
    await products.drop().catch(() => {});
  }

  console.log(
    `Inserting ${TOTAL_PRODUCTS} products in batches of ${BATCH_SIZE}...`,
  );
  const start = Date.now();

  for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_PRODUCTS);
    for (let j = i; j < batchEnd; j++) {
      batch.push(buildProduct(j));
    }
    await products.insertMany(batch, { ordered: false });
    console.log(`Inserted ${batchEnd}/${TOTAL_PRODUCTS}`);
  }

  console.log("Creating indexes...");
  // Compound index used for cursor-based pagination:
  // newest-first sort on created_at, with _id as a tie-breaker for
  // documents that share the exact same created_at timestamp.
  await products.createIndex({ created_at: -1, _id: -1 });
  // Compound index for category filter + same sort/tie-breaker.
  await products.createIndex({ category: 1, created_at: -1, _id: -1 });

  const ms = Date.now() - start;
  console.log(
    `Done. Inserted ${TOTAL_PRODUCTS} products with indexes in ${ms}ms.`,
  );

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
