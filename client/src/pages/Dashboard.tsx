import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import MonthlyOverview from "@/components/MonthlyOverview";
import SavingsGoals from "@/components/SavingsGoals";
import RecentTransactions from "@/components/RecentTransactions";
import UpcomingBills from "@/components/UpcomingBills";
import { apiRequest } from "@/lib/queryClient";
import { 
  SalaryIcon, 
  ShoppingIcon, 
  InvestmentIcon, 
  UtilitiesIcon,
  OtherIcon
} from "@/components/CategoryIcons";
import AnimatedIcon from "@/components/AnimatedIcon";

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
            icon={<SalaryIcon color="text-[#FFD700]" />}
            iconColor=""
          />
          
          <SummaryCard
            title="Total Expenses"
            amount={summary?.totalExpenses || 0}
            icon={<ShoppingIcon color="text-[#F44336]" />}
            iconColor=""
          />
          
          <SummaryCard
            title="Savings"
            amount={summary?.savings || 0}
            icon={<InvestmentIcon color="text-[#4CAF50]" />}
            iconColor=""
          />
          
          <SummaryCard
            title="Vault"
            amount={summary?.totalVault || 0}
            icon={<InvestmentIcon color="text-[#FFD700]" />}
            iconColor=""
          />
          
          <SummaryCard
            title="Debt"
            amount={summary?.totalDebts || 0}
            icon={<OtherIcon color="text-[#FF9800]" />}
            iconColor=""
          />
          
          <SummaryCard
            title="EMI & Bills"
            amount={summary?.totalBills || 0}
            icon={<UtilitiesIcon color="text-[#2196F3]" />}
            iconColor=""
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
