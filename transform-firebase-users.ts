/**
 * Script to transform Firebase Auth export JSON into Convex migration format.
 * 
 * Usage:
 * 1. Export users from Firebase: firebase auth:export users.json --format=json
 * 2. Run this script: npx tsx transform-firebase-users.ts users.json transformed-users.json
 * 3. Use the output in Convex dashboard or via CLI
 */

import { readFileSync, writeFileSync } from "fs";

interface FirebaseUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

interface TransformedUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: number;
}

function transformFirebaseUsers(inputFile: string, outputFile: string): void {
  try {
    const data = readFileSync(inputFile, "utf-8");
    const firebaseUsers: FirebaseUser[] = JSON.parse(data);

    const transformed: TransformedUser[] = firebaseUsers
      .filter((user) => user.email) // Skip users without email
      .map((user) => ({
        uid: user.uid,
        email: user.email!.trim().toLowerCase(),
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        createdAt: user.createdAt ? new Date(user.createdAt).getTime() : undefined,
      }));

    writeFileSync(outputFile, JSON.stringify(transformed, null, 2), "utf-8");

    console.log(`✅ Successfully transformed ${transformed.length} users`);
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log("\nNext steps:");
    console.log("1. Open Convex Dashboard");
    console.log("2. Go to Functions > users.migration:migrateExistingUsers");
    console.log("3. Run mutation with the transformed data:");
    console.log(`   { "users": ${JSON.stringify(transformed.slice(0, 2))}${transformed.length > 2 ? " /* ... */" : ""} }`);
    console.log("\nOr use Convex CLI:");
    console.log(`   npx convex run users.migration:migrateExistingUsers --args '{"users": ${JSON.stringify(transformed).slice(0, 500)}...}'`);
  } catch (error) {
    console.error("❌ Error transforming users:", error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log("Usage: npx tsx transform-firebase-users.ts <input-file> <output-file>");
  console.log("\nExample:");
  console.log("  firebase auth:export users.json --format=json");
  console.log("  npx tsx transform-firebase-users.ts users.json transformed-users.json");
  process.exit(1);
}

const [inputFile, outputFile] = args;
transformFirebaseUsers(inputFile, outputFile);
