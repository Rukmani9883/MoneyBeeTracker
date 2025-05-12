import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import MonthlyOverview from "@/components/MonthlyOverview";
import SavingsGoals from "@/components/SavingsGoals";
import RecentTransactions from "@/components/RecentTransactions";
import UpcomingBills from "@/components/UpcomingBills";
import DateSelector from "@/components/DateSelector";
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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Handle date change from DateSelector
  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['/api/dashboard/summary', userId, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    }
  });

  // Removed auto-creation of demo data so users can enter their own data

  // Empty monthly chart data (will be populated by user input)
  const monthlyData: { name: string; income: number; expenses: number; isCurrent: boolean }[] = [];

  return (
    <>
      <Header title="Dashboard" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Filter by Period</h2>
          <DateSelector onDateChange={handleDateChange} />
        </div>
        
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <SummaryCard
            title="Total Income"
            amount={summary?.totalIncome || 0}
            icon={<SalaryIcon color="text-[#FFD700]" />}
            iconColor=""
            linkTo="/income"
          />
          
          <SummaryCard
            title="Total Expenses"
            amount={summary?.totalExpenses || 0}
            icon={<ShoppingIcon color="text-[#F44336]" />}
            iconColor=""
            linkTo="/expenses"
          />
          
          <SummaryCard
            title="Savings"
            amount={summary?.savings || 0}
            icon={<InvestmentIcon color="text-[#4CAF50]" />}
            iconColor=""
            linkTo="/savings"
          />
          
          <SummaryCard
            title="Vault"
            amount={summary?.totalVault || 0}
            icon={<InvestmentIcon color="text-[#FFD700]" />}
            iconColor=""
            linkTo="/vault"
          />
          
          <SummaryCard
            title="Debt"
            amount={summary?.totalDebts || 0}
            icon={<OtherIcon color="text-[#FF9800]" />}
            iconColor=""
            linkTo="/debt"
          />
          
          <SummaryCard
            title="EMI & Bills"
            amount={summary?.totalBills || 0}
            icon={<UtilitiesIcon color="text-[#2196F3]" />}
            iconColor=""
            linkTo="/bills"
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
