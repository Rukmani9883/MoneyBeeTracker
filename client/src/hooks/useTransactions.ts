import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useTransactions(userId: number, limit?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all transactions
  const allTransactionsQuery = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });
  
  // Get recent transactions
  const recentTransactionsQuery = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/recent', { userId, limit }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/recent?userId=${userId}&limit=${limit || 5}`);
      if (!res.ok) throw new Error('Failed to fetch recent transactions');
      return res.json();
    }
  });
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: {
      userId: number;
      type: string;
      sourceId?: number | null;
      destinationId?: number | null;
      amount: number;
      description: string;
      date: Date;
      category?: string;
    }) => {
      return apiRequest("POST", "/api/transactions", transaction);
    },
    onSuccess: () => {
      toast({
        title: "Transaction created",
        description: "Your transaction has been recorded successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  return {
    allTransactions: allTransactionsQuery.data || [],
    recentTransactions: recentTransactionsQuery.data || [],
    isLoading: allTransactionsQuery.isLoading || recentTransactionsQuery.isLoading,
    createTransaction: createTransactionMutation.mutate,
    isCreating: createTransactionMutation.isPending,
  };
}
