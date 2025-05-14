import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Debt } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import DateSelector from "@/components/DateSelector";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import DebtForm from "@/components/DebtForm";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

interface DebtPageProps {
  userId: number;
}

const DebtPage = ({ userId }: DebtPageProps) => {
  const [activeTab, setActiveTab] = useState("you-owe");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebtId, setDeletingDebtId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all debts with date filtering
  const { data: debts, isLoading } = useQuery<Debt[]>({
    queryKey: ['/api/debts', userId, selectedMonth, selectedYear],
    queryFn: async () => {
      // For JavaScript, months are 0-based (0 = January, 11 = December)
      // But the API expects 1-based months, so we add 1 to selectedMonth
      const jsMonth = selectedMonth + 1;
      const res = await fetch(`/api/debts?userId=${userId}&month=${jsMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch debts');
      return res.json();
    }
  });
  
  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Delete debt mutation
  const deleteDebtMutation = useMutation({
    mutationFn: async (debtId: number) => {
      return apiRequest(
        'DELETE',
        `/api/debts/${debtId}`,
        null
      );
    },
    onSuccess: () => {
      toast({
        title: "Debt deleted",
        description: "The debt record has been removed successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] });
      setDeletingDebtId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete debt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteDebt = () => {
    if (deletingDebtId) {
      deleteDebtMutation.mutate(deletingDebtId);
    }
  };

  // Filter debts based on active tab
  const filteredDebts = debts?.filter(debt => {
    if (activeTab === "you-owe") return debt.isOwedByUser;
    return !debt.isOwedByUser;
  }) || [];

  // Calculate total debt amounts
  const totalYouOwe = debts?.filter(d => d.isOwedByUser).reduce((sum, debt) => sum + debt.remainingAmount, 0) || 0;
  const totalOwedToYou = debts?.filter(d => !d.isOwedByUser).reduce((sum, debt) => sum + debt.remainingAmount, 0) || 0;

  // Data for pie chart (by category)
  const getPieChartData = (isOwedByUser: boolean) => {
    if (!debts) return [];
    
    const categoryMap = new Map<string, number>();
    
    debts.filter(d => d.isOwedByUser === isOwedByUser).forEach(debt => {
      const category = debt.category || 'Other';
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + debt.remainingAmount);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  };

  const youOweChartData = getPieChartData(true);
  const owedToYouChartData = getPieChartData(false);
  
  // Colors for the pie chart
  const COLORS = ['#F44336', '#2196F3', '#FFD700', '#FF9800', '#9C27B0', '#4CAF50'];

  return (
    <>
      <Header title="Debt Manager" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Filter by Period</h2>
          <DateSelector onDateChange={handleDateChange} />
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#CCCCCC] font-medium text-sm">Total I Owe</div>
                <div className="text-[#F44336]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                    <path d="M22 4L12 14.01l-3-3"></path>
                  </svg>
                </div>
              </div>
              <div className="font-mono font-medium text-xl text-white">{formatCurrency(totalYouOwe)}</div>
              <div className="mt-2 text-xs flex items-center text-[#CCCCCC]">
                <span className="mr-2">Across {debts?.filter(d => d.isOwedByUser).length || 0} loans</span>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs text-[#FFD700] hover:bg-[#2D2D2D] hover:text-[#FFD700]"
                  onClick={() => {
                    setShowAddForm(true);
                    setActiveTab("you-owe");
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#CCCCCC] font-medium text-sm">Total Owed to You</div>
                <div className="text-[#4CAF50]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
              </div>
              <div className="font-mono font-medium text-xl text-white">{formatCurrency(totalOwedToYou)}</div>
              <div className="mt-2 text-xs flex items-center text-[#CCCCCC]">
                <span className="mr-2">From {debts?.filter(d => !d.isOwedByUser).length || 0} borrowers</span>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs text-[#FFD700] hover:bg-[#2D2D2D] hover:text-[#FFD700]"
                  onClick={() => {
                    setShowAddForm(true);
                    setActiveTab("owed-to-you");
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-xl font-semibold">Debt Manager</CardTitle>
              <Button 
                className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Debt
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue="you-owe" 
                className="w-full"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="bg-[#2D2D2D] text-[#CCCCCC]">
                  <TabsTrigger 
                    value="you-owe" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Debts I Owe
                  </TabsTrigger>
                  <TabsTrigger 
                    value="owed-to-you" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Debts Owed to You
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="you-owe" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : filteredDebts.length > 0 ? (
                    <div className="rounded-md border border-[#2D2D2D]">
                      <Table>
                        <TableHeader className="bg-[#2D2D2D]">
                          <TableRow>
                            <TableHead className="text-[#CCCCCC]">Name</TableHead>
                            <TableHead className="text-[#CCCCCC]">Category</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Monthly Payment</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Remaining</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDebts.map((debt) => (
                            <TableRow key={debt.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium">
                                <div className="text-white">{debt.name}</div>
                                {debt.dueDate && (
                                  <div className="text-xs text-[#999999]">Due: {formatDateRelative(debt.dueDate)}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-[#CCCCCC]">{debt.category || "Other"}</TableCell>
                              <TableCell className="text-right font-mono text-[#CCCCCC]">
                                {debt.monthlyPayment ? formatCurrency(debt.monthlyPayment) : "N/A"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-[#F44336]">
                                {formatCurrency(debt.remainingAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingDebt(debt)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingDebtId(debt.id)}
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
                      <p className="text-lg mb-2">No debts found that I owe</p>
                      <p className="text-sm text-[#999999] mb-4">Start adding your debts to track them</p>
                      <Button 
                        className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Debt
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="owed-to-you" className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : filteredDebts.length > 0 ? (
                    <div className="rounded-md border border-[#2D2D2D]">
                      <Table>
                        <TableHeader className="bg-[#2D2D2D]">
                          <TableRow>
                            <TableHead className="text-[#CCCCCC]">Borrower</TableHead>
                            <TableHead className="text-[#CCCCCC]">Category</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Monthly Payment</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Remaining</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDebts.map((debt) => (
                            <TableRow key={debt.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium">
                                <div className="text-white">{debt.name}</div>
                                {debt.dueDate && (
                                  <div className="text-xs text-[#999999]">Due: {formatDateRelative(debt.dueDate)}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-[#CCCCCC]">{debt.category || "Personal Loan"}</TableCell>
                              <TableCell className="text-right font-mono text-[#CCCCCC]">
                                {debt.monthlyPayment ? formatCurrency(debt.monthlyPayment) : "N/A"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-[#4CAF50]">
                                {formatCurrency(debt.remainingAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingDebt(debt)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingDebtId(debt.id)}
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
                      <p className="text-lg mb-2">No debts owed to you</p>
                      <p className="text-sm text-[#999999] mb-4">Start tracking money others owe you</p>
                      <Button 
                        className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Debt
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Debt Breakdown</CardTitle>
              <CardDescription className="text-[#CCCCCC]">
                {activeTab === "you-owe" 
                  ? "Categorization of my debts" 
                  : "Breakdown of money owed to me"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeTab === "you-owe" ? youOweChartData : owedToYouChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {(activeTab === "you-owe" ? youOweChartData : owedToYouChartData).map((entry, index) => (
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

                <div className="mt-4 space-y-1">
                  {(activeTab === "you-owe" ? youOweChartData : owedToYouChartData).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm text-[#CCCCCC]">{item.name}</span>
                      </div>
                      <span className="text-sm font-mono text-white">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full mt-6 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#CCCCCC]"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Debt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1E1E1E] border-[#2D2D2D] mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Debt Management Tips</CardTitle>
            <CardDescription className="text-[#CCCCCC]">
              Strategies to manage and reduce debt effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Debt Snowball Method</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Pay minimum payments on all debts and put extra money towards the smallest debt for quick wins.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 010 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Debt Avalanche Method</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Focus on paying off high-interest debts first to save money on interest payments in the long run.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Debt Consolidation</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Combine multiple debts into a single loan with a lower interest rate to simplify payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Debt Dialog */}
      <Dialog 
        open={showAddForm || !!editingDebt} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingDebt(null);
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Edit Debt' : 'Add Debt'}</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              {editingDebt 
                ? 'Update the debt details below.' 
                : 'Add a new debt record to your tracker.'}
            </DialogDescription>
          </DialogHeader>
          
          <DebtForm 
            userId={userId}
            debt={editingDebt}
            debtType={activeTab === "you-owe" ? "owned" : "owed"}
            onSuccess={() => {
              setShowAddForm(false);
              setEditingDebt(null);
              queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDebtId} onOpenChange={(open) => !open && setDeletingDebtId(null)}>
        <AlertDialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#CCCCCC]">
              This action cannot be undone. This will permanently delete this debt record from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2D2D2D] text-white hover:bg-[#3D3D3D] border-[#444]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#F44336] text-white hover:bg-red-800"
              onClick={handleDeleteDebt}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DebtPage;
