import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  methodOrUrl: string,
  urlOrData?: any,
  data?: any,
  customOptions: Partial<RequestInit> = {}
): Promise<T> {
  // Handle both usage patterns:
  // 1. apiRequest('DELETE', '/api/incomes/123')
  // 2. apiRequest('/api/incomes/123', { method: 'DELETE' })
  let method: string;
  let url: string;
  let bodyData: any = data;
  
  if (urlOrData && typeof urlOrData === 'object' && urlOrData.method) {
    // Pattern 2: first param is URL, second is options object with method
    method = urlOrData.method;
    url = methodOrUrl;
    bodyData = urlOrData.data || undefined;
  } else {
    // Pattern 1: first param is method, second is URL
    method = methodOrUrl;
    url = urlOrData;
    bodyData = data;
  }
  
  const defaultOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: bodyData ? JSON.stringify(bodyData) : undefined
  };
  
  const fetchOptions = {
    ...defaultOptions,
    ...customOptions,
    headers: {
      ...defaultOptions.headers,
      ...(customOptions.headers || {}),
    },
  };
  
  console.log(`Making ${method} request to ${url}`);
  
  try {
    const res = await fetch(url, fetchOptions);
    await throwIfResNotOk(res);
    
    // Automatically invalidate related query caches based on the URL
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
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
    
    return res.json() as Promise<T>;
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
    console.log(`Fetching: ${queryKey[0]}`);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      console.log(`Response status for ${queryKey[0]}: ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Auth check failed (401) for ${queryKey[0]}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data received for ${queryKey[0]}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
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
