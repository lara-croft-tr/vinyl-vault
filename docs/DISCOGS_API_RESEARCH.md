# Discogs API Research

*Researched: February 2, 2026*
*For: Matt's Vinyl Collection Manager*

## API Overview

**Base URL:** `https://api.discogs.com`
**Version:** v2
**Database Size:** ~19M releases, ~9.8M artists, ~2.2M labels

## Authentication

### Options:
1. **User Token** (simplest for personal apps)
   - Generate at: discogs.com → Settings → Developer Settings
   - Pass via header: `Authorization: Discogs token=YOUR_TOKEN`
   - Good for: Single-user apps, your own collection

2. **OAuth 1.0a** (for multi-user apps)
   - Required for: Apps that access other users' data
   - More complex flow with consumer key/secret

### Rate Limits:
- **Authenticated:** 60 requests/minute
- **Unauthenticated:** 25 requests/minute
- Headers show remaining: `X-Discogs-Ratelimit-Remaining`

## Key Endpoints

### Database (Search & Browse)

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /database/search?q={query}` | ✅ Yes | Search releases, artists, labels |
| `GET /releases/{id}` | ❌ No | Get release details |
| `GET /masters/{id}` | ❌ No | Get master release (all versions) |
| `GET /artists/{id}` | ❌ No | Get artist info |
| `GET /labels/{id}` | ❌ No | Get label info |

**Search Parameters:**
- `q` - Query string
- `type` - release, master, artist, label
- `format` - Vinyl, CD, Cassette, etc.
- `country` - Release country
- `year` - Release year
- `genre` - Genre filter
- `style` - Style filter

### Collection Management

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /users/{username}/collection/folders` | ✅ Yes | List collection folders |
| `GET /users/{username}/collection/folders/{id}/releases` | ✅ Yes | Get releases in folder |
| `POST /users/{username}/collection/folders/{id}/releases/{release_id}` | ✅ Yes | Add to collection |
| `DELETE /users/{username}/collection/folders/{id}/releases/{release_id}/instances/{instance_id}` | ✅ Yes | Remove from collection |
| `GET /users/{username}/collection/value` | ✅ Yes | Get collection value estimate |

**Collection Fields:**
- Custom fields can be added (purchase price, notes, etc.)
- Condition grading (Mint, NM, VG+, etc.)
- Multiple instances of same release supported

### Marketplace

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /marketplace/stats/{release_id}` | ❌ No | Price stats (lowest, num for sale) |
| `GET /marketplace/listings/{listing_id}` | ✅ Yes | Get listing details |
| `GET /marketplace/search` | ✅ Yes | Search marketplace |
| `GET /users/{username}/inventory` | ✅ Yes | User's for-sale inventory |

**Marketplace Search Filters:**
- `release_id` - Specific release
- `country` - Seller country (US for USA)
- `currency` - Price currency
- `condition` - Media condition
- `format` - Vinyl, 7", 12", LP, etc.
- `ships_from` - Shipping origin

### Wantlist

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /users/{username}/wants` | ✅ Yes | Get wantlist |
| `PUT /users/{username}/wants/{release_id}` | ✅ Yes | Add to wantlist |
| `DELETE /users/{username}/wants/{release_id}` | ✅ Yes | Remove from wantlist |

## Release Data Structure

```json
{
  "id": 249504,
  "title": "Never Gonna Give You Up",
  "artists": [{"name": "Rick Astley", "id": 72872}],
  "year": 1987,
  "country": "UK",
  "formats": [{"name": "Vinyl", "descriptions": ["7\"", "45 RPM", "Single"]}],
  "labels": [{"name": "RCA", "catno": "PB 41447"}],
  "genres": ["Electronic", "Pop"],
  "styles": ["Synth-pop"],
  "tracklist": [...],
  "community": {
    "have": 3932,
    "want": 577,
    "rating": {"count": 227, "average": 3.82}
  },
  "num_for_sale": 120,
  "lowest_price": 0.71
}
```

## What We Can Build

### Feature 1: Collection Catalog ✅

**Discogs Already Provides:**
- Full collection management via their API
- Custom fields for purchase price, notes
- Condition grading
- Folder organization
- Collection value estimates

**Our App Could Add:**
- Better UI/UX than Discogs mobile app
- Offline access to collection
- Barcode scanning to add records
- Custom reports and stats
- Insurance documentation
- Location tracking (which shelf/crate)

### Feature 2: Marketplace Search (US Vendors) ✅

**Available via API:**
- `GET /marketplace/search` with `ships_from=US` or `country=US`
- Filter by condition, format, price range
- Sort by price, condition, seller rating

**Our App Could Add:**
- Save searches / alerts
- Price tracking over time
- Compare across conditions
- Aggregate view of all US listings
- "Best deal" recommendations

## Technical Considerations

### For Railway Deployment:

**Stack Options:**
1. **Node.js + Express + React**
   - Fast to build
   - Good Discogs libraries exist
   - React Native possible for mobile later

2. **Python + FastAPI + React**
   - Official client deprecated but REST is fine
   - Good for data processing

3. **Next.js (Full Stack)**
   - Server components for API calls
   - Built-in API routes
   - Vercel or Railway deploy easily

### Database Needs:
- Store collection locally (faster than hitting API)
- Cache search results
- Price history tracking
- User preferences

**Suggested:** PostgreSQL on Railway (included in plan)

### Auth Strategy:
- User generates their own Discogs token
- We store encrypted in our DB
- All API calls use their token
- OR: We register as OAuth app, they auth via Discogs

## Matt's Answers (Feb 2, 2026)

1. ✅ **Has Discogs account** - Can import existing collection
2. ✅ **Both features priority** - Catalog AND marketplace hunting
3. ✅ **Web first, mobile later**
4. ✅ **Wantlist in-app** - User enters albums they're hunting

## App Design Plan

### Core Features (MVP)

**1. Collection View**
- Import from Discogs account
- Browse/search your vinyl
- Add custom fields (location, purchase price)
- Stats & insights

**2. Wantlist Manager**
- Add albums you're hunting
- Sync with Discogs wantlist (optional)
- Priority levels
- Notes per item

**3. Marketplace Scanner**
- Search US vendors for wantlist items
- Price tracking & alerts
- Filter by condition
- "Best deal" recommendations
- Link to purchase

### Tech Stack (Recommended)

```
Frontend:  Next.js 14 (React + Server Components)
Backend:   Next.js API routes
Database:  PostgreSQL (Railway native)
Auth:      Discogs OAuth or user token input
Hosting:   Railway
```

### Database Schema (Draft)

```
users
  - id
  - discogs_username
  - discogs_token (encrypted)
  - created_at

collection_items (cached from Discogs)
  - id
  - user_id
  - release_id
  - title
  - artist
  - format
  - condition
  - custom_location
  - purchase_price
  - purchase_date
  - synced_at

wantlist_items
  - id
  - user_id
  - release_id (nullable - can be manual entry)
  - title
  - artist
  - priority (1-5)
  - max_price
  - min_condition
  - notes
  - found (boolean)

price_history
  - id
  - release_id
  - lowest_price
  - num_for_sale
  - checked_at
```

### Railway Costs

- **Hobby Plan:** $5/month (plenty for this)
- **PostgreSQL:** Included
- **Custom domain:** Supported

## Next Steps

1. Get Matt's Discogs username
2. Matt generates Discogs developer token
3. Build MVP with collection import + wantlist
4. Add marketplace search
5. Deploy to Railway
6. Iterate!

---

*Ready to build tomorrow!* 🎵
