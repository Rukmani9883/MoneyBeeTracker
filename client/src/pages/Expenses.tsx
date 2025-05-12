import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Expense } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import TransactionForm from "@/components/TransactionForm";
import DateSelector from "@/components/DateSelector";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
import { Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExpensesPageProps {
  userId: number;
}

const ExpensesPage = ({ userId }: ExpensesPageProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses', userId, selectedMonth, selectedYear],
    queryFn: async () => {
      // For JavaScript, months are 0-based (0 = January, 11 = December)
      // But the API expects 1-based months, so we add 1 to selectedMonth
      const jsMonth = selectedMonth + 1;
      const res = await fetch(`/api/expenses?userId=${userId}&month=${jsMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    }
  });
  
  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      return apiRequest(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been removed successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete expense: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Process expense data for charts
  const getCategoryData = () => {
    if (!expenses) return [];
    
    const categoryMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, existing + expense.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getCategoryData();
  const COLORS = ['#F44336', '#2196F3', '#FF9800', '#9C27B0', '#4CAF50'];

  const handleDeleteConfirm = () => {
    if (deletingExpenseId) {
      deleteExpenseMutation.mutate(deletingExpenseId);
      setDeletingExpenseId(null);
    }
  };

  const getTotalExpenses = () => {
    if (!expenses) return 0;
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Data for weekly expenses chart
  const weeklyData = [
    { name: 'Mon', amount: 120 },
    { name: 'Tue', amount: 85 },
    { name: 'Wed', amount: 100 },
    { name: 'Thu', amount: 75 },
    { name: 'Fri', amount: 180 },
    { name: 'Sat', amount: 220 },
    { name: 'Sun', amount: 160 },
  ];

  return (
    <>
      <Header title="Expenses" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Filter by Period</h2>
          <DateSelector onDateChange={handleDateChange} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-xl font-semibold">Expense Overview</CardTitle>
              <Button 
                className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue="all" 
                className="w-full"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="bg-[#2D2D2D] text-[#CCCCCC]">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="categories" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Categories
                  </TabsTrigger>
                  <TabsTrigger 
                    value="weekly" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Weekly
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : expenses && expenses.length > 0 ? (
                    <div className="rounded-md border border-[#2D2D2D]">
                      <Table>
                        <TableHeader className="bg-[#2D2D2D]">
                          <TableRow>
                            <TableHead className="text-[#CCCCCC]">Name</TableHead>
                            <TableHead className="text-[#CCCCCC]">Category</TableHead>
                            <TableHead className="text-[#CCCCCC]">Date</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Amount</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.map((expense) => (
                            <TableRow key={expense.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium text-white">{expense.name}</TableCell>
                              <TableCell className="text-[#CCCCCC]">{expense.category}</TableCell>
                              <TableCell className="text-[#CCCCCC]">{formatDateRelative(expense.date)}</TableCell>
                              <TableCell className="text-right font-mono text-[#F44336]">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingExpense(expense)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingExpenseId(expense.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-[#CCCCCC]">
                      <p className="text-lg mb-2">No expense records found</p>
                      <p className="text-sm text-[#999999]">Start adding your expenses to track them</p>
                      <Button 
                        className="mt-4 bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="categories" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-60 bg-[#2D2D2D] rounded w-full"></div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {chartData.map((entry, index) => (
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
                          <Legend formatter={(value) => <span style={{ color: '#CCCCCC' }}>{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-[#CCCCCC]">
                      <p className="text-lg mb-2">No expense data available</p>
                      <p className="text-sm text-[#999999]">Add expenses to see category breakdown</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="weekly" className="mt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
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
                        <Legend wrapperStyle={{ color: '#CCCCCC' }} />
                        <Bar 
                          dataKey="amount" 
                          name="Expense" 
                          fill="#F44336" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Expense Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-center mb-4">
                  <h3 className="text-[#CCCCCC] text-sm">Total Expenses</h3>
                  <p className="text-2xl font-mono font-medium text-white">{formatCurrency(getTotalExpenses())}</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[#CCCCCC] text-sm mb-2">Top Categories</h4>
                    <div className="space-y-3">
                      {chartData.slice(0, 3).map((category, index) => (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white">{category.name}</span>
                            <span className="text-white font-mono">{formatCurrency(category.value)}</span>
                          </div>
                          <div className="h-2 bg-[#2D2D2D] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${(category.value / getTotalExpenses() * 100).toFixed(0)}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#2D2D2D]">
                    <h4 className="text-[#CCCCCC] text-sm mb-2">Recent Expenses</h4>
                    {expenses && expenses.length > 0 ? (
                      <div className="space-y-3">
                        {expenses.slice(0, 4).map((expense) => (
                          <div key={expense.id} className="flex justify-between items-center">
                            <div>
                              <p className="text-white text-sm">{expense.name}</p>
                              <p className="text-[#999999] text-xs">{formatDateRelative(expense.date)}</p>
                            </div>
                            <p className="text-[#F44336] font-mono">{formatCurrency(expense.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#999999] text-sm">No recent expenses</p>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#CCCCCC]"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Expense
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog 
        open={showAddForm || !!editingExpense} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingExpense(null);
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              {editingExpense 
                ? 'Update the expense details below.' 
                : 'Add a new expense to your financial records.'}
            </DialogDescription>
          </DialogHeader>
          
          <TransactionForm 
            userId={userId}
            type="expense"
            existingTransaction={editingExpense}
            onSuccess={() => {
              setShowAddForm(false);
              setEditingExpense(null);
              queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingExpenseId} onOpenChange={(open) => !open && setDeletingExpenseId(null)}>
        <AlertDialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#CCCCCC]">
              This action cannot be undone. This will permanently delete this expense record from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2D2D2D] text-white hover:bg-[#3D3D3D] border-[#444]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#F44336] text-white hover:bg-red-800"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExpensesPage;
