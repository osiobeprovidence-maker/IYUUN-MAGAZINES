<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# IYUUN Magazine

This project is a Vite + React app using Firebase Auth + Firestore, with Convex handling file storage uploads.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in your own Firebase web app values:
   `VITE_FIREBASE_API_KEY`
   `VITE_FIREBASE_AUTH_DOMAIN`
   `VITE_FIREBASE_PROJECT_ID`
   `VITE_FIREBASE_MESSAGING_SENDER_ID`
   `VITE_FIREBASE_APP_ID`
   `VITE_FIREBASE_MEASUREMENT_ID`
4. Add `VITE_CONVEX_URL` for your Convex deployment.
5. Optional: set `VITE_GEMINI_API_KEY` if you want AI recommendations enabled.
6. Leave `VITE_USE_FIREBASE_EMULATORS` unset or set it to `false` unless you are actively running the Firebase emulators.
7. Run `npm run dev`.

## Vercel environment variables

Add the same `VITE_FIREBASE_*` values and `VITE_CONVEX_URL` in Vercel under Project Settings -> Environment Variables.

## Firebase notes

- This app now uses the default Firestore database for your Firebase project.
- Local development now uses your live Firebase project by default. Set `VITE_USE_FIREBASE_EMULATORS="true"` only when the Auth and Firestore emulators are running locally.
- Firebase Auth and Firestore stay enabled in the app.
- Media uploads now go through Convex storage using Convex upload URLs plus stored file URLs.
- The checked-in `.env` uses `https://greedy-turtle-185.eu-west-1.convex.cloud` as the frontend Convex URL.
- The local Convex CLI also created `.env.local`, which can override the cloud URL during local development.
- The checked-in `.firebaserc` should be updated to your own Firebase project ID before using Firebase CLI deploy commands.
