import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Income } from "@shared/schema";
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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
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

interface IncomePageProps {
  userId: number;
}

const IncomePage = ({ userId }: IncomePageProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incomes, isLoading, refetch } = useQuery<Income[]>({
    queryKey: ['/api/incomes', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/incomes?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch incomes');
      return res.json();
    },
    refetchOnMount: true,
    staleTime: 0,
  });
  
  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const deleteIncomeMutation = useMutation({
    mutationFn: async (incomeId: number) => {
      return apiRequest(`/api/incomes/${incomeId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Income deleted",
        description: "The income has been removed successfully.",
        variant: "default",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/incomes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete income: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Process income data for chart
  const getCategoryData = () => {
    if (!incomes) return [];
    
    const categoryMap = new Map<string, number>();
    
    incomes.forEach(income => {
      const existing = categoryMap.get(income.category) || 0;
      categoryMap.set(income.category, existing + income.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getCategoryData();
  const COLORS = ['#4CAF50', '#2196F3', '#FFD700', '#FF9800', '#9C27B0'];

  const handleDeleteConfirm = () => {
    if (deletingIncomeId) {
      deleteIncomeMutation.mutate(deletingIncomeId);
      setDeletingIncomeId(null);
    }
  };

  const getTotalIncome = () => {
    if (!incomes) return 0;
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  };

  return (
    <>
      <Header title="Income" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Filter by Period</h2>
          <DateSelector onDateChange={handleDateChange} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-xl font-semibold">Income Overview</CardTitle>
              <Button 
                className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Income
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
                    value="monthly" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recurring" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Recurring
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : incomes && incomes.length > 0 ? (
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
                          {incomes.map((income) => (
                            <TableRow key={income.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium text-white">{income.name}</TableCell>
                              <TableCell className="text-[#CCCCCC]">{income.category}</TableCell>
                              <TableCell className="text-[#CCCCCC]">{formatDateRelative(income.date)}</TableCell>
                              <TableCell className="text-right font-mono text-[#4CAF50]">
                                {formatCurrency(income.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingIncome(income)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingIncomeId(income.id)}
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
                      <p className="text-lg mb-2">No income records found</p>
                      <p className="text-sm text-[#999999]">Start adding your income sources to track them</p>
                      <Button 
                        className="mt-4 bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Income
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="monthly" className="mt-4">
                  <div className="text-center py-10 text-[#CCCCCC]">
                    <p className="text-lg mb-2">Monthly view coming soon</p>
                    <p className="text-sm text-[#999999]">This feature is under development</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="recurring" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : incomes && incomes.filter(i => i.recurring).length > 0 ? (
                    <div className="rounded-md border border-[#2D2D2D]">
                      <Table>
                        <TableHeader className="bg-[#2D2D2D]">
                          <TableRow>
                            <TableHead className="text-[#CCCCCC]">Name</TableHead>
                            <TableHead className="text-[#CCCCCC]">Category</TableHead>
                            <TableHead className="text-[#CCCCCC]">Frequency</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Amount</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomes.filter(i => i.recurring).map((income) => (
                            <TableRow key={income.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium text-white">{income.name}</TableCell>
                              <TableCell className="text-[#CCCCCC]">{income.category}</TableCell>
                              <TableCell className="text-[#CCCCCC] capitalize">{income.frequency}</TableCell>
                              <TableCell className="text-right font-mono text-[#4CAF50]">
                                {formatCurrency(income.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingIncome(income)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingIncomeId(income.id)}
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
                      <p className="text-lg mb-2">No recurring income found</p>
                      <p className="text-sm text-[#999999]">Add recurring income for better tracking</p>
                      <Button 
                        className="mt-4 bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Recurring Income
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="text-center mb-2">
                  <h3 className="text-[#CCCCCC] text-sm">Total Income</h3>
                  <p className="text-2xl font-mono font-medium text-white">{formatCurrency(getTotalIncome())}</p>
                </div>
                
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
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
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#CCCCCC]">
                    <p>No data to display</p>
                  </div>
                )}
                
                <div className="mt-4 space-y-2">
                  {chartData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm text-[#CCCCCC]">{category.name}</span>
                      </div>
                      <span className="text-sm font-mono text-white">
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Income Dialog */}
      <Dialog 
        open={showAddForm || !!editingIncome} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingIncome(null);
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              {editingIncome 
                ? 'Update the income details below.' 
                : 'Add a new income source to your financial records.'}
            </DialogDescription>
          </DialogHeader>
          
          <TransactionForm 
            userId={userId}
            type="income"
            existingTransaction={editingIncome}
            onSuccess={() => {
              setShowAddForm(false);
              setEditingIncome(null);
              
              // Refresh all related data
              refetch();
              queryClient.invalidateQueries({ queryKey: ['/api/incomes'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
              queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
              
              // Force an immediate refetch for fresh data
              setTimeout(() => {
                refetch();
              }, 500);
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingIncomeId} onOpenChange={(open) => !open && setDeletingIncomeId(null)}>
        <AlertDialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#CCCCCC]">
              This action cannot be undone. This will permanently delete this income record from your account.
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

export default IncomePage;
