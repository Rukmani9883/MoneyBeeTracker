import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Saving } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useSavings(userId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get all savings
  const savingsQuery = useQuery<Saving[]>({
    queryKey: ['/api/savings', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/savings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch savings');
      return res.json();
    }
  });
  
  // Get current month's savings
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  
  const currentSavingQuery = useQuery<Saving>({
    queryKey: ['/api/savings/monthly', { userId, month: currentMonth, year: currentYear }],
    queryFn: async () => {
      const res = await fetch(`/api/savings/monthly?userId=${userId}&month=${currentMonth}&year=${currentYear}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch current savings');
      return res.json();
    }
  });
  
  // Create or update savings goal
  const savingsMutation = useMutation({
    mutationFn: async (savingData: {
      userId: number;
      month: string;
      year: number;
      amount: number;
      goal: number;
    }) => {
      if (currentSavingQuery.data?.id) {
        return apiRequest("PUT", `/api/savings/${currentSavingQuery.data.id}`, savingData);
      } else {
        return apiRequest("POST", "/api/savings", savingData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Savings goal updated",
        description: "Your savings goal has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/savings/monthly'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update savings goal: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  return {
    savings: savingsQuery.data || [],
    currentSaving: currentSavingQuery.data,
    isLoading: savingsQuery.isLoading || currentSavingQuery.isLoading,
    setSavingsGoal: savingsMutation.mutate,
    isUpdating: savingsMutation.isPending,
  };
}
