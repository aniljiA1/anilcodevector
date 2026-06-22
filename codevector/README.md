# CodeVector Task — Product Browser

## Deploy:
Live Demo: https://anilcodevector.vercel.app
Backend health: https://anilcodevector.onrender.com/api/health

**Stack:** Next.js (frontend) + Node.js/Express (backend) + MongoDB

## Why this stack
- MongoDB: easy to seed in bulk, and a compound index gives O(log n) range
  scans which is exactly what keyset pagination needs.
- Express: minimal, makes the pagination logic easy to read and explain.
- Next.js: simple client-rendered table, no SSR complexity needed for this task.

## The two things this task actually tests

### 1. Fast pagination on 200k rows
Used **keyset ("cursor") pagination**, not `skip`/`limit` (offset pagination).

`skip(N)` gets linearly slower the deeper you page, because MongoDB has to
walk and discard N documents every time. Keyset pagination instead says
"give me everything older than the last item I saw" using an indexed
range query — page 1 and page 9,000 cost the same.

Index: `{ created_at: -1, _id: -1 }` (and a second one prefixed with
`category` for filtered browsing). `_id` is the tie-breaker for documents
that land on the exact same `created_at` millisecond.

### 2. Correctness while data is changing
The sort key is **`created_at`**, which never changes after a product is
created — only `updated_at` changes on edits. Because the cursor is a
value `(created_at, _id)` and not a row count:
- New products inserted at the top (created_at = now) never shift the
  meaning of an existing cursor.
- Edits to existing products (which only touch `updated_at`/`price`)
  don't move them in the list, so they can't suddenly reappear or vanish
  from a page the user already has.

Net effect: while 50 products are inserted/updated, an in-progress
pagination session sees no duplicates and misses nothing.

See `backend/server.js` for the full reasoning in comments, and
`backend/simulateLiveChanges.js` for a script that inserts 50 new products
and updates 50 existing ones, to test this live.

## Folder structure
```
backend/    Express API + seed script + Mongo
frontend/   Next.js UI
```

## Running locally

### Backend
```bash
cd backend
cp .env.example .env   # fill in MONGODB_URI
npm install
npm run seed            # generates 200,000 products (one-time)
npm start                # http://localhost:4000
```

To test correctness under live changes while browsing:
```bash
node simulateLiveChanges.js
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev              # http://localhost:3000
```

## API

`GET /api/products?category=Books&limit=20&cursor=<opaque>`
```json
{
  "items": [ { "_id": "...", "name": "...", "category": "...", "price": 12.5, "created_at": "...", "updated_at": "..." } ],
  "nextCursor": "opaque-base64-token-or-null",
  "hasMore": true
}
```

`GET /api/categories` → `{ "categories": ["Automotive", "Beauty & Personal Care", ...] }`

## What I'd improve with more time
- Add a total-count estimate (approximate, via `$collStats`, since an exact
  `count()` on 200k+ docs with filters is itself a slow operation that
  doesn't scale — wouldn't compute it on every request).
- Add backward (previous-page) cursors server-side instead of keeping the
  cursor stack in frontend state, so deep-linking to a specific page works.
- Add automated tests that insert/update concurrently with paginated reads
  and assert no duplicates/gaps.
- Rate-limiting / auth on the API if this were a real product.

## How I used AI
Used Claude to scaffold the boilerplate (Express routes, Next.js page,
package.json files) quickly, but the pagination *design* — keyset vs offset,
and choosing `created_at` over `updated_at` as the sort key for stability —
is the core decision the task is testing, and is laid out in comments in
`backend/server.js` and `backend/simulateLiveChanges.js` 

## Author 
**Anil Kumar**
