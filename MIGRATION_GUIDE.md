# Old User Sync Solution for Firebase → Convex

## Problem
New users created with Firebase Authentication are now properly synced to Convex (fixed in previous update). However, **existing/old users** who created accounts before the fix may not have their profiles in Convex.

## Solution Overview

I've created a migration system to backfill existing Firebase users into Convex. This involves:

### 1. New Migration File: `/workspace/convex/users.migration.ts`

This file contains two functions:

#### `listAllUsers` (Query)
- Lists all users currently in Convex
- Useful for reviewing before/after migration
- Shows which users have `tokenIdentifier` set (already synced) vs those without

#### `migrateExistingUsers` (Internal Mutation)
- Takes an array of Firebase user data
- Creates or updates Convex user records
- Properly sets the `tokenIdentifier` to match Convex's Firebase integration format
- Handles three scenarios:
  1. **Already synced**: Skips users with matching tokenIdentifier
  2. **Email exists**: Links existing Convex record to Firebase UID
  3. **New record**: Creates complete user profile

## How to Run the Migration

### Step 1: Export Firebase Users

You need to export your Firebase users. Here are two methods:

#### Method A: Using Firebase CLI (Recommended)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Export all users to a JSON file
firebase auth:export users.json --format=json
```

#### Method B: Using Admin SDK (Node.js Script)

Create a script `export-firebase-users.js`:

```javascript
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize with your service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const auth = admin.auth();

async function exportUsers() {
  const users = [];
  let nextPageToken;
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    listUsersResult.users.forEach((userRecord) => {
      users.push({
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || undefined,
        photoURL: userRecord.photoURL || undefined,
        createdAt: userRecord.metadata.creationTime ? 
          new Date(userRecord.metadata.creationTime).getTime() : undefined,
      });
    });
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  fs.writeFileSync('firebase-users-export.json', JSON.stringify(users, null, 2));
  console.log(`Exported ${users.length} users`);
}

exportUsers().catch(console.error);
```

Run it:
```bash
node export-firebase-users.js
```

### Step 2: Transform the Data

The Firebase export format differs slightly from what our migration expects. Create a transformation script:

```javascript
const fs = require('fs');

// Read Firebase export
const firebaseExport = JSON.parse(fs.readFileSync('users.json', 'utf8'));

// Transform to migration format
const usersForMigration = firebaseExport.users.map(user => ({
  uid: user.uid,
  email: user.email || '',
  displayName: user.displayName || undefined,
  photoURL: user.photoURL || undefined,
  createdAt: user.createdAt ? new Date(user.createdAt).getTime() : undefined,
}));

fs.writeFileSync('migration-input.json', JSON.stringify({ users: usersForMigration }, null, 2));
console.log(`Prepared ${usersForMigration.length} users for migration`);
```

### Step 3: Run the Migration

You have several options:

#### Option A: Using Convex Dashboard (Easiest)

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to "Functions" → "users.migration"
3. Click on `migrateExistingUsers`
4. Paste the JSON from `migration-input.json`
5. Click "Run"

#### Option B: Using Convex CLI

```bash
# Make sure you're logged in
npx convex login

# Run the migration
npx convex run users.migration:migrateExistingUsers --json-args '{"users":[...]}'
```

#### Option C: From Your Application (Admin-only)

Add this to your admin panel:

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

function MigrationButton({ usersData }: { usersData: any[] }) {
  const migrate = useMutation(api.users.migration.migrateExistingUsers);
  
  const handleMigration = async () => {
    try {
      const result = await migrate({ users: usersData });
      alert(`Migration complete! Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`);
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Check console for details.');
    }
  };
  
  return (
    <button onClick={handleMigration}>
      Migrate {usersData.length} Users
    </button>
  );
}
```

### Step 4: Verify the Migration

After running the migration:

1. **Check Convex Dashboard**: View the users table to confirm all users have `tokenIdentifier` set
2. **Test Login**: Have a few old users log in and verify they can access their accounts
3. **Run List Query**: Use the `listAllUsers` query to see all users and their sync status

```typescript
// In your app or browser console
const users = await convex.query(api.users.migration.listAllUsers);
console.table(users);
```

## Important Notes

### Token Identifier Format

The migration uses the correct format for Convex's Firebase integration:
```
https://securetoken.google.com/<project-id>:<uid>
```

This matches what Convex automatically generates when verifying Firebase ID tokens.

### Duplicates Prevention

The migration is safe to run multiple times because it:
- Checks for existing `tokenIdentifier` first (skips if found)
- Falls back to email matching for partial migrations
- Never creates duplicate records

### Super Admin Handling

The migration automatically detects the super admin email (`riderezzy@gmail.com`) and assigns:
- Role: `admin`
- Editor Status: `approved`
- Premium: `true`

### Rollback Plan

If something goes wrong, you can:
1. Export current Convex users using `listAllUsers`
2. Manually delete incorrectly migrated users from Convex dashboard
3. Fix the input data and re-run

## Post-Migration Checklist

- [ ] All users have `tokenIdentifier` set
- [ ] Email addresses are correct and normalized (lowercase)
- [ ] Super admin has correct role/permissions
- [ ] Test login with 2-3 old user accounts
- [ ] Verify user profiles display correctly
- [ ] Check that role-based access works (admin/editor/viewer)

## Troubleshooting

### Error: "Authentication required"
- Make sure you're running as an authenticated admin user
- Internal mutations still require proper authentication

### Error: "Index not found"
- Ensure your Convex schema has the required indexes:
  - `by_tokenIdentifier` on users table
  - `by_email` on users table

### Users Not Appearing After Login
- Clear browser cache/localStorage
- Force refresh the page (Ctrl+Shift+R)
- Check browser console for errors

## Future Maintenance

For ongoing user sync, the existing `syncCurrentUser` mutation in `/workspace/convex/users.ts` handles:
- New user registration
- Profile updates
- Token refresh scenarios

The migration is only needed once for historical data.
