import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import MonthlyOverview from "@/components/MonthlyOverview";
import SavingsGoals from "@/components/SavingsGoals";
import RecentTransactions from "@/components/RecentTransactions";
import UpcomingBills from "@/components/UpcomingBills";
import { apiRequest } from "@/lib/queryClient";

interface DashboardProps {
  userId: number;
}

interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  totalVault: number;
  totalDebts: number;
  totalDebtsOwedToUser: number;
  totalBills: number;
  upcomingBills: any[];
  recentTransactions: any[];
}

const Dashboard = ({ userId }: DashboardProps) => {
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['/api/dashboard/summary', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    }
  });

  // Create demo data if none exists
  useEffect(() => {
    if (summary && summary.totalIncome === 0 && summary.totalExpenses === 0) {
      apiRequest('POST', `/api/demo-data?userId=${userId}`, {})
        .catch(console.error);
    }
  }, [summary, userId]);

  // Monthly chart data (for the last 6 months)
  const monthlyData = [
    { name: 'Jan', income: 4000, expenses: 2400, isCurrent: false },
    { name: 'Feb', income: 4200, expenses: 2800, isCurrent: false },
    { name: 'Mar', income: 3800, expenses: 2700, isCurrent: false },
    { name: 'Apr', income: 4250, expenses: 2840, isCurrent: true },
    { name: 'May', income: 3000, expenses: 1800, isCurrent: false },
    { name: 'Jun', income: 3500, expenses: 2200, isCurrent: false },
  ];

  return (
    <>
      <Header title="Dashboard" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <SummaryCard
            title="Total Income"
            amount={summary?.totalIncome || 0}
            percentChange={12}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            }
            iconColor="text-[#FFD700]"
          />
          
          <SummaryCard
            title="Total Expenses"
            amount={summary?.totalExpenses || 0}
            percentChange={8}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
            }
            iconColor="text-[#F44336]"
          />
          
          <SummaryCard
            title="Savings"
            amount={summary?.savings || 0}
            percentChange={18}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m5 0h1M9 11h1m5 0h1M9 15h1m5 0h1"></path>
              </svg>
            }
            iconColor="text-[#4CAF50]"
          />
          
          <SummaryCard
            title="Vault"
            amount={summary?.totalVault || 0}
            percentChange={4}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="12" cy="10" r="3"></circle>
                <path d="M12 13v4"></path>
                <path d="M7 13h10"></path>
              </svg>
            }
            iconColor="text-[#FFD700]"
          />
          
          <SummaryCard
            title="Debt"
            amount={summary?.totalDebts || 0}
            percentChange={-5}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                <path d="M22 4L12 14.01l-3-3"></path>
              </svg>
            }
            iconColor="text-[#FF9800]"
          />
          
          <SummaryCard
            title="EMI & Bills"
            amount={summary?.totalBills || 0}
            percentChange={0}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            }
            iconColor="text-[#2196F3]"
          />
        </div>

        {/* Monthly Cashflow & Savings Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <MonthlyOverview data={monthlyData} />
          <SavingsGoals userId={userId} />
        </div>

        {/* Recent Transactions & Upcoming Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions userId={userId} />
          <UpcomingBills userId={userId} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
