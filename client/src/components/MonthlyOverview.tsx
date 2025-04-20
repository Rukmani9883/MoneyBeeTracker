import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useState } from 'react';

interface MonthlyData {
  name: string;
  income: number;
  expenses: number;
  isCurrent?: boolean;
}

interface MonthlyOverviewProps {
  data: MonthlyData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2D2D2D] p-3 rounded shadow-lg border border-[#444444]">
        <p className="text-[#F5F5F5] font-semibold mb-1">{label}</p>
        <p className="text-[#4CAF50]">
          Income: {new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
          }).format(payload[0].value)}
        </p>
        <p className="text-[#F44336]">
          Expenses: {new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
          }).format(payload[1].value)}
        </p>
        <p className="text-[#FFD700] pt-1 border-t border-[#444444] mt-1">
          Savings: {new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR' 
          }).format(payload[0].value - payload[1].value)}
        </p>
      </div>
    );
  }
  return null;
};

const MonthlyOverview = ({ data }: MonthlyOverviewProps) => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  
  // Filter data based on selected timeframe (simplified for demo)
  const filteredData = data;

  return (
    <div className="bg-[#1E1E1E] rounded-xl p-5 shadow-lg col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-white">Monthly Cashflow</h3>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              timeframe === 'week' 
                ? 'bg-[#2D2D2D] text-[#FFD700]' 
                : 'text-[#CCCCCC] hover:text-[#FFD700]'
            }`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              timeframe === 'month' 
                ? 'bg-[#2D2D2D] text-[#FFD700]' 
                : 'text-[#CCCCCC] hover:text-[#FFD700]'
            }`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              timeframe === 'year' 
                ? 'bg-[#2D2D2D] text-[#FFD700]' 
                : 'text-[#CCCCCC] hover:text-[#FFD700]'
            }`}
            onClick={() => setTimeframe('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
              tickFormatter={(value) => `₹${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-[#CCCCCC]">{value}</span>}
            />
            <Bar 
              dataKey="income" 
              name="Income" 
              fill="#4CAF50" 
              radius={[4, 4, 0, 0]} 
              barSize={15}
            />
            <Bar 
              dataKey="expenses" 
              name="Expenses" 
              fill="#F44336" 
              radius={[4, 4, 0, 0]} 
              barSize={15}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyOverview;
