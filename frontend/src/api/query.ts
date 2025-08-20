import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type { AxiosError } from "axios";

// Generic API response type
export interface ApiResponse<T = any> {
  ok: boolean;
  data: T;
  trace_id: string;
}

// Generic error response type
export interface ApiError {
  ok: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  trace_id: string;
}

// Custom hook for API queries with proper typing
export function useApiQuery<TData = any>(
  queryKey: string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<ApiResponse<TData>, AxiosError<ApiError>>, 'queryKey' | 'queryFn'>
) {
  console.log("useApiQuery called with:", { queryKey, endpoint });
  
  return useQuery({
    queryKey,
    queryFn: async (): Promise<ApiResponse<TData>> => {
      console.log("Executing query for:", endpoint);
      try {
        const response = await api.get<ApiResponse<TData>>(endpoint);
        console.log("Query successful for:", endpoint, response.data);
        return response.data;
      } catch (error) {
        console.error("Query failed for:", endpoint, error);
        throw error;
      }
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    ...options,
  });
}

// Query keys for different endpoints
export const queryKeys = {
  holdings: ["holdings"] as string[],
  positions: ["positions"] as string[],
  orders: ["orders"] as string[],
  trades: ["trades"] as string[],
  pnl: ["pnl"] as string[],
};

// Pre-configured query options
export const defaultQueryOptions = {
  staleTime: 0, // Always fetch fresh data
  gcTime: 5 * 60 * 1000, // 5 minutes
  retry: 3,
  refetchOnWindowFocus: true,
  refetchOnMount: true,
} as const;
