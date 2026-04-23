import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import App from './App.tsx';
import { useFirebaseConvexAuth } from './convexAuth.ts';
import './index.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    [
      'Missing VITE_CONVEX_URL.',
      'For local dev: add it to .env.local and restart the Vite dev server.',
      'For Vercel: add it in Project Settings -> Environment Variables and redeploy.',
    ].join(' '),
  );
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseConvexAuth}>
      <App />
    </ConvexProviderWithAuth>
  </StrictMode>,
);
