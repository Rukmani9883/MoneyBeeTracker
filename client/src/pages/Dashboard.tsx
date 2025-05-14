import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import RecentTransactions from "@/components/RecentTransactions";
import UpcomingBills from "@/components/UpcomingBills";
import DateSelector from "@/components/DateSelector";
import { ResetDataButton } from "@/components/ResetDataButton";
import { 
  SalaryIcon, 
  ShoppingIcon, 
  InvestmentIcon, 
  UtilitiesIcon,
  OtherIcon
} from "@/components/CategoryIcons";
import AnimatedIcon from "@/components/AnimatedIcon";
import ExpenseChart from "@/components/ExpenseChart";
import Vault from "@/components/Vault";

interface DashboardProps {
  userId: number;
}

interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  billPayments: number;
  totalVault: number;
  totalUpcomingBills: number;
  totalBills: number;
  upcomingBills: any[];
  recentTransactions: any[];
  vaultGoals?: any[];
}

const Dashboard = ({ userId }: DashboardProps) => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Handle date change from DateSelector
  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    
    // When date changes, invalidate all queries that depend on it
    // For API, we need month to be 1-based
    const apiMonth = month + 1;
    
    // Invalidate transaction queries to force a refresh
    queryClient.invalidateQueries({ 
      queryKey: ['/api/transactions/monthly', { userId, month: apiMonth, year }]
    });
    
    // Invalidate upcoming bills
    queryClient.invalidateQueries({
      queryKey: ['/api/bills/upcoming', { userId, month: apiMonth, year }]
    });
  };
  
  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['/api/dashboard/summary', userId, selectedMonth, selectedYear],
    queryFn: async () => {
      // For JavaScript, months are 0-based (0 = January, 11 = December)
      // But the API expects 1-based months, so we add 1 to selectedMonth
      const jsMonth = selectedMonth + 1;
      const res = await fetch(`/api/dashboard/summary?userId=${userId}&month=${jsMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    }
  });

  // Effect to refresh data when a financial transaction is added/updated/deleted
  useEffect(() => {
    // Create event listener for custom events signaling financial data changes
    const handleFinancialDataChange = () => {
      // Invalidate all relevant queries to ensure fresh data
      const apiMonth = selectedMonth + 1;
      
      // Invalidate dashboard summary
      queryClient.invalidateQueries({ 
        queryKey: ['/api/dashboard/summary', userId, selectedMonth, selectedYear]
      });
      
      // Invalidate transactions
      queryClient.invalidateQueries({ 
        queryKey: ['/api/transactions/monthly', { userId, month: apiMonth, year: selectedYear }]
      });
      
      // Invalidate upcoming bills
      queryClient.invalidateQueries({
        queryKey: ['/api/bills/upcoming', { userId, month: apiMonth, year: selectedYear }]
      });
    };
    
    // Add listener for the custom event
    window.addEventListener('financial-data-changed', handleFinancialDataChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('financial-data-changed', handleFinancialDataChange);
    };
  }, [queryClient, userId, selectedMonth, selectedYear]);

  return (
    <>
      <Header title="Dashboard" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <h2 className="text-lg font-medium text-white">Filter by Period</h2>
            <DateSelector onDateChange={handleDateChange} />
          </div>
          <div className="flex justify-end">
            <ResetDataButton />
          </div>
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
            title="Monthly Savings"
            amount={summary?.savings || 0}
            subtitle={summary?.savings ? 
              `${Math.round((summary.savings / (summary.totalIncome || 1)) * 100)}% of income` :
              "No savings yet"}
            icon={<InvestmentIcon color="text-[#4CAF50]" />}
            iconColor=""
            linkTo="/savings"
          />
          
          <SummaryCard
            title="Vault Goals"
            amount={summary?.totalVault || 0}
            icon={<InvestmentIcon color="text-[#FFD700]" />}
            iconColor=""
            linkTo="/vault"
          />
          
          <SummaryCard
            title="Upcoming Bills"
            amount={summary?.totalUpcomingBills || 0}
            icon={<UtilitiesIcon color="text-[#2196F3]" />}
            iconColor=""
            linkTo="/bills"
          />
        </div>

        {/* Expense Chart & Vault */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
          <div className="lg:col-span-7">
            <ExpenseChart 
              userId={userId}
              month={selectedMonth}
              year={selectedYear}
            />
          </div>
          <div className="lg:col-span-3">
            <Vault 
              userId={userId} 
              monthlySavings={summary?.savings || 0} 
            />
          </div>
        </div>

        {/* Recent Transactions & Upcoming Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions 
            userId={userId} 
            month={selectedMonth} 
            year={selectedYear}
          />
          <UpcomingBills 
            userId={userId}
            month={selectedMonth} 
            year={selectedYear}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
