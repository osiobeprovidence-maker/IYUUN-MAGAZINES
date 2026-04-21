<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# IYUUN Magazine

This project is a Vite + React app connected to your own Firebase project through environment variables.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in your own Firebase web app values:
   `VITE_FIREBASE_API_KEY`
   `VITE_FIREBASE_AUTH_DOMAIN`
   `VITE_FIREBASE_PROJECT_ID`
   `VITE_FIREBASE_STORAGE_BUCKET`
   `VITE_FIREBASE_MESSAGING_SENDER_ID`
   `VITE_FIREBASE_APP_ID`
   `VITE_FIREBASE_MEASUREMENT_ID`
4. Optional: set `VITE_GEMINI_API_KEY` if you want AI recommendations enabled.
5. Run `npm run dev`.

## Vercel environment variables

Add the same `VITE_FIREBASE_*` values in Vercel under Project Settings -> Environment Variables.

## Firebase notes

- This app now uses the default Firestore database for your Firebase project.
- The checked-in `.firebaserc` should be updated to your own Firebase project ID before using Firebase CLI deploy commands.
