import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ExpenseChartProps {
  userId: number;
  month: number;
  year: number;
}

interface ExpenseData {
  name: string;
  value: number;
  running: number; // For running total in waterfall
  color: string;
}

const ExpenseChart = ({ userId, month, year }: ExpenseChartProps) => {
  const [chartData, setChartData] = useState<ExpenseData[]>([]);
  
  // Get expenses by category
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['/api/expenses', userId, month, year],
    queryFn: async () => {
      // API expects 1-based months
      const apiMonth = month + 1;
      const res = await fetch(`/api/expenses?userId=${userId}&month=${apiMonth}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    }
  });
  
  useEffect(() => {
    if (expenses && expenses.length > 0) {
      // Group expenses by category
      const categoryData: { [key: string]: number } = {};
      
      expenses.forEach((expense: any) => {
        if (categoryData[expense.category]) {
          categoryData[expense.category] += expense.amount;
        } else {
          categoryData[expense.category] = expense.amount;
        }
      });
      
      // Sort categories by amount (highest to lowest)
      const sortedCategories = Object.entries(categoryData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Limit to top 5 categories for visualization
      
      // Calculate running total for waterfall chart
      let runningTotal = 0;
      
      // Create chart data in waterfall format
      const waterfallData = sortedCategories.map(([category, amount], index) => {
        runningTotal += amount;
        
        // Define colors for categories
        const colors = [
          "#F44336", // Red
          "#FF9800", // Orange
          "#FFEB3B", // Yellow
          "#4CAF50", // Green
          "#2196F3", // Blue
          "#9C27B0"  // Purple
        ];
        
        return {
          name: category,
          value: amount,
          running: runningTotal,
          color: colors[index % colors.length]
        };
      });
      
      setChartData(waterfallData);
    } else {
      setChartData([]);
    }
  }, [expenses]);
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E1E1E] p-3 border border-[#444] rounded-md shadow-lg">
          <p className="font-medium text-white">{label}</p>
          <p className="text-[#F44336]">
            Amount: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-[#FFD700]">
            Running Total: {formatCurrency(payload[0].payload.running)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="bg-[#121212] border-[#333] shadow-md h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg">
          Expense Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 5, bottom: 5 }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#CCCCCC' }} 
                axisLine={{ stroke: '#444' }}
              />
              <YAxis 
                tick={{ fill: '#CCCCCC' }} 
                axisLine={{ stroke: '#444' }}
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(value)
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#444" />
              <Bar 
                dataKey="value" 
                name="Expense" 
                fill="#F44336"
                barSize={40}
                radius={[4, 4, 0, 0]}
              />
              <Line 
                type="monotone" 
                dataKey="running" 
                name="Total" 
                stroke="#FFD700" 
                dot={{ stroke: '#FFD700', strokeWidth: 2, r: 4, fill: '#121212' }}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col justify-center items-center h-64 text-center">
            <div className="text-[#666] text-lg mb-2">No expense data available</div>
            <div className="text-[#444] text-sm">Add expenses to see your spending breakdown</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseChart;
