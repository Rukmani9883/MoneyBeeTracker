import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import ProgressBar from "./ProgressBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultGoal } from "@shared/schema";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";
import GoalForm from "./GoalForm";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VaultProps {
  userId: number;
  monthlySavings?: number;
}

interface AllocationResult {
  allocated: boolean;
  totalAmount: number;
  totalAllocated: number;
  allocations: Array<{
    goalId: number;
    goalName: string;
    allocatedAmount: number;
    newTotal: number;
    targetAmount: number;
    percentage: number;
  }>;
  remainingUnallocated: number;
  message?: string;
}

const Vault = ({ userId, monthlySavings = 0 }: VaultProps) => {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: goals, isLoading } = useQuery<VaultGoal[]>({
    queryKey: ['/api/vault-goals', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/vault-goals?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch goals');
      return res.json();
    }
  });

  // Limit to top 3 goals for the dashboard view
  const topGoals = goals?.slice(0, 3) || [];
  
  // Function to refresh goals data
  const refreshGoals = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['/api/vault-goals']
    });
  }, [queryClient]);
  
  // Listen for financial data changes
  useEffect(() => {
    const handleFinancialDataChanged = () => {
      console.log('Financial data changed, refreshing vault goals');
      refreshGoals();
    };
    
    // Add event listener
    window.addEventListener('financial-data-changed', handleFinancialDataChanged);
    
    // Clean up
    return () => {
      window.removeEventListener('financial-data-changed', handleFinancialDataChanged);
    };
  }, [refreshGoals]);
  
  // Get the current date for the allocation
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  
  // Auto-allocate savings mutation
  const autoAllocateMutation = useMutation({
    mutationFn: async (amount: number) => {
      setIsAllocating(true);
      return await apiRequest('POST', '/api/auto-allocate-savings', {
        userId,
        amount,
        month: currentMonth,
        year: currentYear
      });
    },
    onSuccess: (data: AllocationResult) => {
      setAllocationResult(data);
      setShowAllocationDialog(true);
      toast({
        title: "Savings Auto-Allocated",
        description: `Successfully allocated ${formatCurrency(data.totalAllocated)} to your vault goals.`,
        variant: "default",
      });
      refreshGoals();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Allocation Failed",
        description: error.message || "Failed to allocate savings to vault goals.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsAllocating(false);
    }
  });
  
  // Handle auto-allocation
  const handleAutoAllocate = () => {
    if (monthlySavings <= 0) {
      toast({
        title: "Cannot Allocate",
        description: "No savings available to allocate this month.",
        variant: "destructive",
      });
      return;
    }
    
    if (!goals || goals.length === 0) {
      toast({
        title: "No Goals Available",
        description: "Create at least one vault goal first.",
        variant: "destructive",
      });
      return;
    }
    
    autoAllocateMutation.mutate(monthlySavings);
  };

  if (isLoading) {
    return (
      <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg animate-pulse">
        <div className="h-6 bg-[#2D2D2D] rounded w-1/3 mb-6"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-4">
            <div className="h-4 bg-[#2D2D2D] rounded w-full mb-2"></div>
            <div className="h-2 bg-[#2D2D2D] rounded w-full mb-1"></div>
            <div className="h-4 bg-[#2D2D2D] rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Vault</h3>
          <div className="flex items-center space-x-2">
            {monthlySavings > 0 && (
              <button 
                className="text-[#4CAF50] hover:text-green-400 transition-colors flex items-center"
                onClick={handleAutoAllocate}
                disabled={isAllocating}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                <span className="text-xs">Auto-Allocate</span>
              </button>
            )}
            <button 
              className="text-[#FFD700] hover:text-yellow-500 transition-colors" 
              onClick={() => setShowGoalForm(true)}
              aria-label="Add new vault goal"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {monthlySavings > 0 && (
          <div className="mb-4 bg-[#2D2D2D]/50 rounded-lg p-3 flex items-center text-sm">
            <Sparkles className="h-4 w-4 mr-2 text-[#FFD700]" />
            <p className="text-[#CCCCCC]">
              Available to allocate: <span className="text-white font-medium">{formatCurrency(monthlySavings)}</span>
            </p>
          </div>
        )}
        
        {topGoals.length > 0 ? (
          topGoals.map(goal => {
            const currentAmount = goal.currentAmount || 0;
            const targetAmount = goal.targetAmount || 1; // prevent division by zero
            const progressPercentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
            const formattedCurrent = formatCurrency(currentAmount);
            const formattedTarget = formatCurrency(targetAmount);
            
            // Calculate how much is needed to complete the goal
            const remainingAmount = Math.max(0, targetAmount - currentAmount);
            const remainingText = remainingAmount > 0 
              ? `${formatCurrency(remainingAmount)} to go` 
              : 'Goal achieved!';
            
            return (
              <div key={goal.id} className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-sm">{goal.name}</span>
                  <span className="text-xs font-mono text-[#CCCCCC]">
                    {formattedCurrent} / {formattedTarget}
                  </span>
                </div>
                <ProgressBar 
                  percentage={progressPercentage}
                  color={
                    progressPercentage >= 100 ? "#4CAF50" :
                    progressPercentage >= 70 ? "#FFD700" :
                    progressPercentage >= 40 ? "#2196F3" : "#FF9800"
                  }
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-[#999999]">{progressPercentage}% complete</span>
                  <span className={`text-xs ${progressPercentage >= 100 ? 'text-[#4CAF50]' : 'text-[#FFD700]'}`}>
                    {remainingText}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-[#CCCCCC]">
            <p>No vault goals yet</p>
            <p className="text-sm text-[#999999] mt-1">Add a goal to start tracking your savings targets</p>
          </div>
        )}
        
        {goals && goals.length > 3 && (
          <button className="w-full mt-4 bg-[#2D2D2D] hover:bg-[#2D2D2D]/80 py-2 rounded-lg text-[#CCCCCC] text-sm transition-colors">
            View All Goals
          </button>
        )}

        {showGoalForm && (
          <GoalForm 
            userId={userId} 
            onClose={() => setShowGoalForm(false)} 
          />
        )}
      </div>
      
      {/* Auto-allocation results dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-semibold text-white">
              Vault Auto-Allocation
            </DialogTitle>
          </DialogHeader>
          
          {allocationResult && (
            <div className="my-2">
              {!allocationResult.allocated && allocationResult.message ? (
                <div className="flex items-center justify-center p-4 text-amber-400">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{allocationResult.message}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 bg-[#2D2D2D] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#CCCCCC]">Total allocated:</span>
                      <span className="text-white font-mono">{formatCurrency(allocationResult.totalAllocated)}</span>
                    </div>
                    {allocationResult.remainingUnallocated > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#CCCCCC]">Remaining unallocated:</span>
                        <span className="text-white font-mono">{formatCurrency(allocationResult.remainingUnallocated)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {allocationResult.allocations.map((allocation, index) => (
                      <div key={index} className="bg-[#2D2D2D]/60 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">{allocation.goalName}</span>
                          <span className="text-[#4CAF50] font-mono">+{formatCurrency(allocation.allocatedAmount)}</span>
                        </div>
                        <ProgressBar 
                          percentage={allocation.percentage}
                          color={
                            allocation.percentage >= 100 ? "#4CAF50" :
                            allocation.percentage >= 70 ? "#FFD700" :
                            allocation.percentage >= 40 ? "#2196F3" : "#FF9800"
                          }
                        />
                        <div className="flex justify-between items-center mt-1 text-xs">
                          <span className="text-[#CCCCCC]">New balance: {formatCurrency(allocation.newTotal)}</span>
                          <span className="text-[#CCCCCC]">{allocation.percentage}% of goal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <DialogFooter className="mt-4">
                <Button 
                  onClick={() => setShowAllocationDialog(false)}
                  className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Vault;
