import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VaultGoal } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import ProgressBar from "@/components/ProgressBar";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, ArrowUp, ArrowDown, Trash2, PiggyBank } from "lucide-react";
import GoalForm from "@/components/GoalForm";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VaultPageProps {
  userId: number;
}

const VaultPage = ({ userId }: VaultPageProps) => {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isWithdrawingFunds, setIsWithdrawingFunds] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get vault goals
  const { data: goals, isLoading } = useQuery<VaultGoal[]>({
    queryKey: ['/api/vault-goals', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/vault-goals?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch vault goals');
      return res.json();
    }
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: number, amount: number }) => {
      return apiRequest('POST', `/api/vault-goals/${goalId}/add-funds`, { amount });
    },
    onSuccess: () => {
      toast({
        title: "Funds added",
        description: "The funds have been added to your goal successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vault-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      setIsAddingFunds(false);
      setFundAmount("");
      setSelectedGoalId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add funds: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Withdraw funds mutation
  const withdrawFundsMutation = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: number, amount: number }) => {
      return apiRequest('POST', `/api/vault-goals/${goalId}/withdraw-funds`, { amount });
    },
    onSuccess: () => {
      toast({
        title: "Funds withdrawn",
        description: "The funds have been withdrawn from your goal successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vault-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      setIsWithdrawingFunds(false);
      setFundAmount("");
      setSelectedGoalId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to withdraw funds: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      return apiRequest('DELETE', `/api/vault-goals/${goalId}`, null);
    },
    onSuccess: () => {
      toast({
        title: "Goal deleted",
        description: "The goal has been deleted successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vault-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      setDeletingGoalId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete goal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddFunds = () => {
    if (!selectedGoalId) return;
    if (!fundAmount || isNaN(parseFloat(fundAmount)) || parseFloat(fundAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to add.",
        variant: "destructive",
      });
      return;
    }

    addFundsMutation.mutate({
      goalId: selectedGoalId,
      amount: parseFloat(fundAmount)
    });
  };

  const handleWithdrawFunds = () => {
    if (!selectedGoalId) return;
    if (!fundAmount || isNaN(parseFloat(fundAmount)) || parseFloat(fundAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw.",
        variant: "destructive",
      });
      return;
    }

    const selectedGoal = goals?.find(g => g.id === selectedGoalId);
    if (selectedGoal && parseFloat(fundAmount) > selectedGoal.currentAmount) {
      toast({
        title: "Insufficient funds",
        description: "You cannot withdraw more than the current amount in this goal.",
        variant: "destructive",
      });
      return;
    }

    withdrawFundsMutation.mutate({
      goalId: selectedGoalId,
      amount: parseFloat(fundAmount)
    });
  };

  const handleDeleteGoal = () => {
    if (deletingGoalId) {
      deleteGoalMutation.mutate(deletingGoalId);
    }
  };

  // Calculate total vault amount
  const totalVaultAmount = goals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;

  // Data for pie chart
  const pieChartData = goals?.map(goal => ({
    name: goal.name,
    value: goal.currentAmount
  })) || [];

  const COLORS = ['#4CAF50', '#2196F3', '#FFD700', '#FF9800', '#9C27B0', '#E91E63'];

  return (
    <>
      <Header title="Vault" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] md:col-span-2">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-xl font-semibold">Future Goals & Funds</CardTitle>
                <Button 
                  className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                  onClick={() => setIsAddingGoal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Goal
                </Button>
              </div>
              <CardDescription className="text-[#CCCCCC]">
                Track your progress towards your financial goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="bg-[#2D2D2D] border-[#444] animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-5 bg-[#3D3D3D] rounded w-3/4 mb-4"></div>
                        <div className="h-8 bg-[#3D3D3D] rounded w-1/2 mb-4"></div>
                        <div className="h-2 bg-[#3D3D3D] rounded w-full mb-2"></div>
                        <div className="h-4 bg-[#3D3D3D] rounded w-full"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : goals && goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map(goal => {
                    const progressPercentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
                    const formattedCurrent = formatCurrency(goal.currentAmount);
                    const formattedTarget = formatCurrency(goal.targetAmount);
                    
                    return (
                      <Card key={goal.id} className="bg-[#2D2D2D] border-[#444]">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-white font-semibold text-lg">{goal.name}</h3>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#3D3D3D]"
                              onClick={() => setDeletingGoalId(goal.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex justify-between mb-2">
                            <span className="text-[#CCCCCC]">Progress</span>
                            <span className="text-[#CCCCCC] font-mono">{formattedCurrent} / {formattedTarget}</span>
                          </div>
                          
                          <ProgressBar 
                            percentage={progressPercentage}
                            color={
                              progressPercentage >= 100 ? "#4CAF50" :
                              progressPercentage >= 50 ? "#FFD700" : "#2196F3"
                            }
                          />
                          
                          <div className="flex justify-between text-xs mt-1 mb-4">
                            <span className="text-[#999999]">{progressPercentage}% complete</span>
                            {goal.deadline && (
                              <span className="text-[#999999]">Due: {formatDateRelative(goal.deadline)}</span>
                            )}
                          </div>
                          
                          {goal.notes && (
                            <p className="text-[#CCCCCC] text-sm mb-4 italic">"{goal.notes}"</p>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button 
                              className="flex-1 bg-[#4CAF50] hover:bg-[#3D9140] text-white"
                              onClick={() => {
                                setSelectedGoalId(goal.id);
                                setIsAddingFunds(true);
                              }}
                            >
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                            <Button 
                              className="flex-1 bg-[#F44336] hover:bg-[#D32F2F] text-white"
                              onClick={() => {
                                setSelectedGoalId(goal.id);
                                setIsWithdrawingFunds(true);
                              }}
                              disabled={goal.currentAmount <= 0}
                            >
                              <ArrowDown className="h-4 w-4 mr-2" />
                              Withdraw
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#2D2D2D] mb-4">
                    <PiggyBank className="h-6 w-6 text-[#FFD700]" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">No goals yet</h3>
                  <p className="text-[#CCCCCC] mb-4">Start creating financial goals to save for future plans</p>
                  <Button 
                    className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                    onClick={() => setIsAddingGoal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Vault Summary</CardTitle>
              <CardDescription className="text-[#CCCCCC]">
                Overview of your savings goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <h3 className="text-[#CCCCCC] text-sm">Total in Vault</h3>
                <p className="text-3xl font-mono font-medium text-white">{formatCurrency(totalVaultAmount)}</p>
              </div>

              {pieChartData.length > 0 ? (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{ 
                          backgroundColor: '#2D2D2D', 
                          border: '1px solid #444', 
                          borderRadius: '4px',
                          color: '#F5F5F5'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-60 flex items-center justify-center text-[#CCCCCC]">
                  <div className="text-center">
                    <PiggyBank className="h-10 w-10 mx-auto mb-2 text-[#2D2D2D]" />
                    <p>No goals data to display</p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-1">
                {pieChartData.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm text-[#CCCCCC]">{goal.name}</span>
                    </div>
                    <span className="text-sm font-mono text-white">
                      {formatCurrency(goal.value)}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full mt-6 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#CCCCCC]"
                onClick={() => setIsAddingGoal(true)}
              >
                <Target className="h-4 w-4 mr-2" />
                Create New Goal
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1E1E1E] border-[#2D2D2D] mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Goal Setting Tips</CardTitle>
            <CardDescription className="text-[#CCCCCC]">
              How to set and achieve your financial goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Be Specific</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Set clear, specific goals with definite amounts and deadlines instead of vague targets.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Prioritize</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Focus on emergency funds and high-impact goals first before addressing other desires.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Small Steps</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Break large goals into smaller milestones to maintain motivation and track progress effectively.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Goal Dialog */}
      <Dialog 
        open={isAddingGoal} 
        onOpenChange={setIsAddingGoal}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              Add a new financial goal to your vault
            </DialogDescription>
          </DialogHeader>
          
          <GoalForm 
            userId={userId} 
            onClose={() => setIsAddingGoal(false)}
            onSuccess={() => {
              setIsAddingGoal(false);
              queryClient.invalidateQueries({ queryKey: ['/api/vault-goals'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog 
        open={isAddingFunds} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingFunds(false);
            setSelectedGoalId(null);
            setFundAmount("");
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds to Goal</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              Contribute money to your savings goal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fund-amount">Amount ($)</Label>
              <Input
                id="fund-amount"
                type="number"
                placeholder="Enter amount to add"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="bg-[#2D2D2D] border-[#444] text-white"
              />
            </div>

            {selectedGoalId && goals && (
              <div className="bg-[#2D2D2D]/50 p-3 rounded-md">
                <div className="text-[#CCCCCC] text-sm">
                  <span>Selected Goal: </span>
                  <span className="text-white font-medium">
                    {goals.find(g => g.id === selectedGoalId)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-[#CCCCCC] text-sm mt-1">
                  <span>Current Amount:</span>
                  <span className="text-white font-mono">
                    {formatCurrency(goals.find(g => g.id === selectedGoalId)?.currentAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-[#CCCCCC] text-sm mt-1">
                  <span>Target:</span>
                  <span className="text-white font-mono">
                    {formatCurrency(goals.find(g => g.id === selectedGoalId)?.targetAmount || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddingFunds(false);
                setSelectedGoalId(null);
                setFundAmount("");
              }}
              className="bg-transparent border-[#444] text-[#CCCCCC] hover:bg-[#2D2D2D] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#4CAF50] text-white hover:bg-[#3D9140]"
              onClick={handleAddFunds}
              disabled={addFundsMutation.isPending}
            >
              {addFundsMutation.isPending ? "Processing..." : "Add Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Funds Dialog */}
      <Dialog 
        open={isWithdrawingFunds} 
        onOpenChange={(open) => {
          if (!open) {
            setIsWithdrawingFunds(false);
            setSelectedGoalId(null);
            setFundAmount("");
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds from Goal</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              Withdraw money from your savings goal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount ($)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount to withdraw"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="bg-[#2D2D2D] border-[#444] text-white"
              />
            </div>

            {selectedGoalId && goals && (
              <div className="bg-[#2D2D2D]/50 p-3 rounded-md">
                <div className="text-[#CCCCCC] text-sm">
                  <span>Selected Goal: </span>
                  <span className="text-white font-medium">
                    {goals.find(g => g.id === selectedGoalId)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-[#CCCCCC] text-sm mt-1">
                  <span>Available to Withdraw:</span>
                  <span className="text-white font-mono">
                    {formatCurrency(goals.find(g => g.id === selectedGoalId)?.currentAmount || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsWithdrawingFunds(false);
                setSelectedGoalId(null);
                setFundAmount("");
              }}
              className="bg-transparent border-[#444] text-[#CCCCCC] hover:bg-[#2D2D2D] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#F44336] text-white hover:bg-[#D32F2F]"
              onClick={handleWithdrawFunds}
              disabled={withdrawFundsMutation.isPending}
            >
              {withdrawFundsMutation.isPending ? "Processing..." : "Withdraw Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Goal Confirmation Dialog */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={(open) => !open && setDeletingGoalId(null)}>
        <AlertDialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#CCCCCC]">
              Are you sure you want to delete this goal? Any funds in this goal will be lost.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2D2D2D] text-white hover:bg-[#3D3D3D] border-[#444]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#F44336] text-white hover:bg-red-800"
              onClick={handleDeleteGoal}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VaultPage;
