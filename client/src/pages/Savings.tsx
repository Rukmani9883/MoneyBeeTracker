import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Saving } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
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
import { Target, TrendingUp, ChevronRight, TrendingDown, AlertTriangle, BadgeCheck } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SavingsPageProps {
  userId: number;
}

const SavingsPage = ({ userId }: SavingsPageProps) => {
  const [isSettingGoal, setIsSettingGoal] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get total income, expenses, and savings from summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['/api/dashboard/summary', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    }
  });

  // Get savings history
  const { data: savings, isLoading: isSavingsLoading } = useQuery<Saving[]>({
    queryKey: ['/api/savings', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/savings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch savings history');
      return res.json();
    }
  });

  // Set savings goal mutation
  const setSavingsGoalMutation = useMutation({
    mutationFn: async (data: { userId: number, month: string, year: number, amount: number, goal: number }) => {
      return apiRequest('POST', `/api/savings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Savings goal set",
        description: "Your monthly savings goal has been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/savings'] });
      setIsSettingGoal(false);
      setGoalAmount("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to set savings goal: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSetGoal = () => {
    if (!goalAmount || isNaN(parseFloat(goalAmount)) || parseFloat(goalAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid savings goal amount.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    setSavingsGoalMutation.mutate({
      userId,
      month: monthNames[now.getMonth()],
      year: now.getFullYear(),
      amount: summary?.savings || 0,
      goal: parseFloat(goalAmount)
    });
  };

  // Get current month's savings
  const currentSaving = savings?.find(s => {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return s.month === monthNames[now.getMonth()] && s.year === now.getFullYear();
  });

  // Calculate savings goal progress
  const savingsProgress = currentSaving 
    ? Math.min(100, Math.round((currentSaving.amount / (currentSaving.goal || 1)) * 100)) 
    : 0;

  // Chart data for savings history
  const chartData = savings?.map(saving => ({
    name: `${saving.month.substr(0, 3)} ${saving.year}`,
    savings: saving.amount,
    goal: saving.goal || 0
  })) || [];

  // Get saving status
  const getSavingStatus = () => {
    if (!summary) return { color: "#999999", icon: <AlertTriangle className="h-5 w-5" />, text: "No data" };
    
    if (summary.totalIncome === 0) {
      return {
        color: "#999999",
        icon: <AlertTriangle className="h-5 w-5" />,
        text: "No income recorded"
      };
    }
    
    const savingsRate = (summary.savings / summary.totalIncome) * 100;
    
    if (savingsRate >= 20) {
      return {
        color: "#4CAF50",
        icon: <BadgeCheck className="h-5 w-5" />,
        text: "Excellent saving"
      };
    } else if (savingsRate >= 10) {
      return {
        color: "#FFD700",
        icon: <TrendingUp className="h-5 w-5" />,
        text: "Good saving"
      };
    } else if (savingsRate > 0) {
      return {
        color: "#FF9800",
        icon: <ChevronRight className="h-5 w-5" />,
        text: "Saving, but could improve"
      };
    } else {
      return {
        color: "#F44336",
        icon: <TrendingDown className="h-5 w-5" />,
        text: "Spending more than earning"
      };
    }
  };

  const savingStatus = getSavingStatus();

  return (
    <>
      <Header title="Savings" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-xl font-semibold">Savings Overview</CardTitle>
                <Button 
                  className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                  onClick={() => setIsSettingGoal(true)}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Set Monthly Goal
                </Button>
              </div>
              <CardDescription className="text-[#CCCCCC]">
                Track your savings progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#CCCCCC' }} 
                      tickLine={{ stroke: '#2D2D2D' }}
                      axisLine={{ stroke: '#2D2D2D' }}
                    />
                    <YAxis 
                      tick={{ fill: '#CCCCCC' }} 
                      tickLine={{ stroke: '#2D2D2D' }}
                      axisLine={{ stroke: '#2D2D2D' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ 
                        backgroundColor: '#2D2D2D', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        color: '#F5F5F5'
                      }}
                      labelStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#CCCCCC' }}
                      formatter={(value) => <span style={{ color: '#CCCCCC' }}>{value}</span>}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="savings" 
                      name="Savings" 
                      stroke="#4CAF50" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="goal" 
                      name="Goal" 
                      stroke="#FFD700" 
                      strokeDasharray="5 5" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#2D2D2D] border-[#444]">
                  <CardContent className="p-4">
                    <div className="text-[#CCCCCC] text-sm mb-1">Income This Month</div>
                    <div className="text-white text-xl font-mono font-semibold">{formatCurrency(summary?.totalIncome || 0)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#2D2D2D] border-[#444]">
                  <CardContent className="p-4">
                    <div className="text-[#CCCCCC] text-sm mb-1">Expenses This Month</div>
                    <div className="text-white text-xl font-mono font-semibold">{formatCurrency(summary?.totalExpenses || 0)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-[#2D2D2D] border-[#444]">
                  <CardContent className="p-4">
                    <div className="text-[#CCCCCC] text-sm mb-1">Savings This Month</div>
                    <div className="text-white text-xl font-mono font-semibold">{formatCurrency(summary?.savings || 0)}</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Savings Goal</CardTitle>
              <CardDescription className="text-[#CCCCCC]">
                Your progress towards this month's goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-white font-medium">Monthly Target</div>
                    <div className="text-[#FFD700] font-mono">
                      {formatCurrency(currentSaving?.goal || 0)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-white font-medium">Current Savings</div>
                    <div className="text-[#4CAF50] font-mono">
                      {formatCurrency(currentSaving?.amount || summary?.savings || 0)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-white font-medium">Remaining</div>
                    <div className="text-[#CCCCCC] font-mono">
                      {formatCurrency(Math.max(0, (currentSaving?.goal || 0) - (currentSaving?.amount || summary?.savings || 0)))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white text-sm">Progress</span>
                    <span className="text-xs font-mono text-[#CCCCCC]">{savingsProgress}%</span>
                  </div>
                  <ProgressBar 
                    percentage={savingsProgress}
                    color={
                      savingsProgress >= 100 ? "#4CAF50" :
                      savingsProgress >= 50 ? "#FFD700" : "#FF9800"
                    }
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-[#999999]">{savingsProgress}% complete</span>
                    {savingsProgress >= 100 ? (
                      <span className="text-xs text-[#4CAF50]">Goal achieved!</span>
                    ) : (
                      <span className="text-xs text-[#FFD700]">Keep saving!</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2D2D2D]">
                  <div className="text-[#CCCCCC] text-sm mb-2">Savings Status</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center" style={{ color: savingStatus.color }}>
                      {savingStatus.icon}
                    </div>
                    <div>
                      <div className="text-white font-medium">{savingStatus.text}</div>
                      <div className="text-[#999999] text-sm">
                        {summary && summary.totalIncome > 0 ? 
                          `${Math.round((summary.savings / summary.totalIncome) * 100)}% of income saved` : 
                          'Start tracking your income'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#CCCCCC]"
                  onClick={() => setIsSettingGoal(true)}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Update Savings Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1E1E1E] border-[#2D2D2D] mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Savings Tips</CardTitle>
            <CardDescription className="text-[#CCCCCC]">
              Smart ways to increase your savings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h3 className="text-white font-medium">50/30/20 Rule</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Allocate 50% of income to needs, 30% to wants, and 20% to savings for a balanced financial plan.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Automate Savings</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Set up automatic transfers to your savings account on payday to ensure consistent saving.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">No-Spend Days</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Designate specific days each month as "no-spend days" to reduce unnecessary purchases.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Set Savings Goal Dialog */}
      <Dialog 
        open={isSettingGoal} 
        onOpenChange={setIsSettingGoal}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Monthly Savings Goal</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              Define how much you want to save this month
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-amount">Goal Amount ($)</Label>
              <Input
                id="goal-amount"
                type="number"
                placeholder="Enter amount"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                className="bg-[#2D2D2D] border-[#444] text-white"
              />
            </div>
            
            <div className="bg-[#2D2D2D]/50 p-3 rounded-md text-[#CCCCCC] text-sm">
              <div className="flex justify-between mb-1">
                <span>Current Monthly Income:</span>
                <span className="text-white font-mono">{formatCurrency(summary?.totalIncome || 0)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Current Monthly Expenses:</span>
                <span className="text-white font-mono">{formatCurrency(summary?.totalExpenses || 0)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#444]">
                <span>Available for Savings:</span>
                <span className="text-[#4CAF50] font-mono">{formatCurrency(summary?.savings || 0)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSettingGoal(false)}
              className="bg-transparent border-[#444] text-[#CCCCCC] hover:bg-[#2D2D2D] hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
              onClick={handleSetGoal}
              disabled={setSavingsGoalMutation.isPending}
            >
              {setSavingsGoalMutation.isPending ? "Saving..." : "Set Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavingsPage;
