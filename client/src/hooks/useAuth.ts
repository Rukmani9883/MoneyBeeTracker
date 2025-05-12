import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useState } from "react";

export function useAuth() {
  // Track when we've done a manual refresh to ensure cookies are correct
  const [hasRefreshed, setHasRefreshed] = useState(false);
  
  // Use a forced fetch for the first load to ensure we have latest auth state
  useEffect(() => {
    // Only do this once
    if (!hasRefreshed) {
      // Make a direct fetch to ensure cookies are properly sent
      fetch("/api/auth/user", { 
        credentials: "include",
        headers: { 'Cache-Control': 'no-cache' }
      })
      .then(() => {
        setHasRefreshed(true);
      })
      .catch(() => {
        setHasRefreshed(true);
      });
    }
  }, [hasRefreshed]);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: hasRefreshed, // Only run the query after we've refreshed
  });

  return {
    user,
    isLoading: isLoading || !hasRefreshed,
    isAuthenticated: !!user,
  };
}