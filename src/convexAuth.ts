import { useCallback, useEffect, useState } from 'react';
import { auth, onIdTokenChanged } from './firebase';

export function useFirebaseConvexAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }
      return user.getIdToken(forceRefreshToken);
    },
    [],
  );

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}
