import { useState, useEffect } from 'react';
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface DateSelectorProps {
  onDateChange: (month: number, year: number) => void;
  className?: string;
}

const DateSelector = ({ onDateChange, className = '' }: DateSelectorProps) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Generate array of months
  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];
  
  // Generate array of years (3 years back and 3 years ahead)
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  
  useEffect(() => {
    onDateChange(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, onDateChange]);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={selectedMonth.toString()}
        onValueChange={(value) => setSelectedMonth(parseInt(value))}
      >
        <SelectTrigger className="w-[140px] bg-[#1E1E1E]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) => setSelectedYear(parseInt(value))}
      >
        <SelectTrigger className="w-[100px] bg-[#1E1E1E]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DateSelector;