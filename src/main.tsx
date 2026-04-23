import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import App from './App.tsx';
import { useFirebaseConvexAuth } from './convexAuth.ts';
import { firebaseConfigError } from './firebase';
import './index.css';

const rawConvexUrl = import.meta.env.VITE_CONVEX_URL;

type RuntimeErrorBoundaryProps = {
  children: React.ReactNode;
  convexUrl: string;
};

type RuntimeErrorBoundaryState = {
  error: Error | null;
};

const convexConfigError = !rawConvexUrl
  ? [
      'Missing VITE_CONVEX_URL.',
      'Add it to your deployment environment variables and redeploy.',
    ].join(' ')
  : null;

const startupErrors = [convexConfigError, firebaseConfigError].filter(Boolean) as string[];

class RuntimeErrorBoundary extends React.Component<RuntimeErrorBoundaryProps, RuntimeErrorBoundaryState> {
  state: RuntimeErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
    console.error('Runtime bootstrap error:', error);
  }

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const isMissingFunctionError = this.state.error.message.includes('Could not find public function');
    const message = isMissingFunctionError
      ? [
          'The frontend is connected to a Convex deployment that does not have the required app functions.',
          `Current VITE_CONVEX_URL: ${this.props.convexUrl}`,
          'Redeploy the backend to that deployment or update the frontend environment to the intended Convex URL and redeploy.',
        ].join(' ')
      : this.state.error.message;

    return <SetupErrorScreen errors={[message]} />;
  }
}

function SetupErrorScreen({ errors }: { errors: string[] }) {
  return (
    <div className="min-h-screen bg-[#F8F8F8] text-brand-black font-sans px-6 py-12 md:px-10 md:py-16">
      <div className="max-w-3xl mx-auto border border-brand-black bg-white shadow-[8px_8px_0_rgba(0,0,0,1)]">
        <div className="border-b border-brand-black px-6 py-4 md:px-8 md:py-5">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-red">IYUUN Deployment Check</p>
          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tighter font-bold mt-3">
            Project setup incomplete
          </h1>
        </div>

        <div className="px-6 py-6 md:px-8 md:py-8 space-y-6">
          <p className="text-sm md:text-base leading-relaxed opacity-80">
            The app did not start because required environment variables are missing in production.
            This screen replaces the blank white crash so you can see exactly what needs to be fixed.
          </p>

          <div className="space-y-3">
            {errors.map((error, index) => (
              <div
                key={`${index}-${error}`}
                className="border border-brand-red bg-brand-red/10 text-brand-red px-4 py-4 text-xs md:text-sm font-bold leading-relaxed"
              >
                {error}
              </div>
            ))}
          </div>

          <div className="border-t border-brand-black pt-6 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">Add these variables in your host dashboard</p>
            <pre className="overflow-x-auto bg-brand-black text-white p-4 text-[11px] md:text-xs leading-6">
{`VITE_CONVEX_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_USE_FIREBASE_EMULATORS=false
VITE_GEMINI_API_KEY=`}
            </pre>
            <p className="text-xs md:text-sm opacity-70 leading-relaxed">
              After adding the missing values, redeploy the site. Once those variables are present,
              the normal application will render again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);

if (startupErrors.length > 0) {
  root.render(
    <StrictMode>
      <SetupErrorScreen errors={startupErrors} />
    </StrictMode>,
  );
} else {
  const convexUrl = rawConvexUrl!.replace(/\/+$/, '');
  const convex = new ConvexReactClient(convexUrl);

  root.render(
    <StrictMode>
      <RuntimeErrorBoundary convexUrl={convexUrl}>
        <ConvexProviderWithAuth client={convex} useAuth={useFirebaseConvexAuth}>
          <App />
        </ConvexProviderWithAuth>
      </RuntimeErrorBoundary>
    </StrictMode>,
  );
}
