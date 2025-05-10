import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };
  
  try {
    const res = await fetch(url, fetchOptions);
    await throwIfResNotOk(res);
    
    // Automatically invalidate related query caches based on the URL
    if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
      const endpoint = url.split('?')[0];
      const basePath = endpoint.split('/').slice(0, -1).join('/') || endpoint;
      
      // Invalidate both the specific endpoint and any collection endpoints
      await queryClient.invalidateQueries({ queryKey: [endpoint] });
      await queryClient.invalidateQueries({ queryKey: [basePath] });
      
      // Always invalidate dashboard summary when modifying data
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      
      // Invalidate the recent transactions if adding a transaction
      if (endpoint.includes('/transactions') || 
          endpoint.includes('/incomes') || 
          endpoint.includes('/expenses')) {
        await queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
      }
    }
    
    return res;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
