require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "codevector";

const app = express();
app.use(cors());
app.use(express.json());

let db;

function encodeCursor(createdAt, id) {
  const payload = JSON.stringify({ c: createdAt.getTime(), i: id.toString() });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const payload = Buffer.from(cursor, "base64url").toString("utf8");
    const { c, i } = JSON.parse(payload);
    return { createdAt: new Date(c), id: new ObjectId(i) };
  } catch (err) {
    return null;
  }
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await db.collection("products").distinct("category");
    res.json({ categories: categories.sort() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : null;
    const cursorParam = req.query.cursor;

    const filter = {};
    if (category) filter.category = category;

    if (cursorParam) {
      const decoded = decodeCursor(cursorParam);
      if (!decoded) {
        return res.status(400).json({ error: "Invalid cursor" });
      }
      // Keyset condition: strictly "older" than the last item seen,
      // using (created_at, _id) as a combined tie-broken key.
      filter.$or = [
        { created_at: { $lt: decoded.createdAt } },
        { created_at: decoded.createdAt, _id: { $lt: decoded.id } },
      ];
    }

    const docs = await db
      .collection("products")
      .find(filter)
      .sort({ created_at: -1, _id: -1 })
      .limit(limit)
      .toArray();

    let nextCursor = null;
    if (docs.length === limit) {
      const last = docs[docs.length - 1];
      nextCursor = encodeCursor(last.created_at, last._id);
    }

    res.json({
      items: docs,
      nextCursor,
      hasMore: nextCursor !== null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

async function start() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB (${DB_NAME})`);

  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
