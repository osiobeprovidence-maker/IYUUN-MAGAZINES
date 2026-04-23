# Backend Migration Plan

## Target Architecture

- Firebase Auth remains the identity provider for now.
- Convex becomes the source of truth for application data and media.
- Firestore is phased out collection-by-collection after dual-read or cutover checks.

## Current Ownership Audit

- Convex today:
  - media upload URLs
  - storage-backed file URLs
- Firestore today:
  - users
  - stories
  - categories
  - ads
  - orders
  - comments
  - subscribers
- Browser-only state today:
  - reading history
  - liked-story flags

## Recommended Migration Order

1. Categories
   - Low-risk shared taxonomy.
   - No auth dependency.
   - Good first proof that the app can read and write app data through Convex.
2. Stories
   - Move the editorial workflow, publish queue, and public archive.
   - Add status indexes and publish-review metadata in Convex.
3. Comments and likes
   - Move article engagement data next so article pages stop mixing backends.
4. Orders
   - Move print requests and fulfillment state.
5. Ads
   - Move campaign storage and click tracking.
6. Users and editorial roles
   - Normalize profiles, role assignments, and editor approval state.
   - Best done after the rest of the content model is stable.
7. Subscribers
   - Simple final move once the primary content collections are stable.

## Why Convex Should Own App Data

- The repo already depends on Convex and ships a Convex provider in the client.
- Media uploads are already there, so keeping content elsewhere creates split ownership.
- Convex gives typed queries and mutations that fit the current React app better than ad hoc Firestore calls inside one giant component.
- The next production-hardening step is server-side authorization, and that is easier once write paths are centralized.

## Safe Rollout Shape

1. Add a new Convex table and public APIs.
2. Read from Convex in the app for that feature.
3. Seed or backfill from Firestore if needed.
4. Stop writing that feature to Firestore.
5. Remove dead Firestore code for that feature.

## This Change Set

- Adds a Convex schema.
- Adds the `categories` table and APIs.
- Seeds the core taxonomy in Convex.
- Switches the React app taxonomy flow from Firestore to Convex.

## Next Change Sets

- Add `stories` table and publish-workflow queries/mutations.
- Replace story reads and editorial writes with Convex.
- Add explicit auth strategy for Convex-backed privileged mutations.
