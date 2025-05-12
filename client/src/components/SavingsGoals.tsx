import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import ProgressBar from "./ProgressBar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultGoal } from "@shared/schema";
import { Plus } from "lucide-react";
import { notifyFinancialDataChanged } from "@/lib/eventUtils";
import GoalForm from "./GoalForm";

interface SavingsGoalsProps {
  userId: number;
}

const SavingsGoals = ({ userId }: SavingsGoalsProps) => {
  const [showGoalForm, setShowGoalForm] = useState(false);
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
      console.log('Financial data changed, refreshing goals');
      refreshGoals();
    };
    
    // Add event listener
    window.addEventListener('financial-data-changed', handleFinancialDataChanged);
    
    // Clean up
    return () => {
      window.removeEventListener('financial-data-changed', handleFinancialDataChanged);
    };
  }, [refreshGoals]);
  
  // No longer automatically creating demo data
  // This was removed to ensure reset data functionality works properly

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
    <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-white">Savings Goals</h3>
        <button 
          className="text-[#FFD700] hover:text-yellow-500 transition-colors" 
          onClick={() => setShowGoalForm(true)}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      
      {topGoals.length > 0 ? (
        topGoals.map(goal => {
          const currentAmount = goal.currentAmount || 0;
          const targetAmount = goal.targetAmount || 1; // prevent division by zero
          const progressPercentage = Math.round((currentAmount / targetAmount) * 100);
          const formattedCurrent = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
          }).format(currentAmount);
          
          const formattedTarget = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
          }).format(targetAmount);
          
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
                  goal.name === "Emergency Fund" ? "#4CAF50" :
                  goal.name === "Vacation 2023" ? "#FFD700" : "#2196F3"
                }
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-[#999999]">{progressPercentage}% complete</span>
                <span className="text-xs text-[#4CAF50]">+₹200 this month</span>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-4 text-[#CCCCCC]">
          <p>No savings goals yet</p>
          <p className="text-sm text-[#999999] mt-1">Add a goal to start tracking your savings</p>
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
  );
};

export default SavingsGoals;
