import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bill } from "@shared/schema";
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
import { Plus, Pencil, Trash2, CheckCircle, Calendar } from "lucide-react";
import BillForm from "@/components/BillForm";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";

interface BillsPageProps {
  userId: number;
}

const BillsPage = ({ userId }: BillsPageProps) => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all bills
  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ['/api/bills', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/bills?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      return res.json();
    }
  });

  // Get upcoming bills
  const { data: upcomingBills } = useQuery<Bill[]>({
    queryKey: ['/api/bills/upcoming', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/bills/upcoming?userId=${userId}&daysAhead=30`);
      if (!res.ok) throw new Error('Failed to fetch upcoming bills');
      return res.json();
    }
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: async (billId: number) => {
      return apiRequest('DELETE', `/api/bills/${billId}`, null);
    },
    onSuccess: () => {
      toast({
        title: "Bill deleted",
        description: "The bill record has been removed successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      setDeletingBillId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete bill: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mark bill as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (billId: number) => {
      return apiRequest('POST', `/api/bills/${billId}/mark-paid`, {});
    },
    onSuccess: () => {
      toast({
        title: "Bill marked as paid",
        description: "The bill has been marked as paid successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark bill as paid: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteBill = () => {
    if (deletingBillId) {
      deleteBillMutation.mutate(deletingBillId);
    }
  };

  // Filter bills based on active tab
  const getFilteredBills = () => {
    if (!bills) return [];
    
    if (activeTab === "upcoming") {
      return upcomingBills || [];
    } else if (activeTab === "paid") {
      return bills.filter(bill => bill.isPaid);
    } else {
      return bills;
    }
  };

  const filteredBills = getFilteredBills();

  // Calculate total upcoming bills amount
  const totalUpcomingAmount = upcomingBills?.reduce((sum, bill) => sum + bill.amount, 0) || 0;

  // Data for bar chart (by category)
  const getChartData = () => {
    if (!bills) return [];
    
    const categoryMap = new Map<string, number>();
    
    bills.forEach(bill => {
      const category = bill.category || 'Other';
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + bill.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getChartData();
  
  // Colors for the chart
  const COLORS = ['#4CAF50', '#2196F3', '#FFD700', '#FF9800', '#9C27B0', '#F44336'];

  // Get status badge for a bill
  const getBillStatus = (bill: Bill) => {
    if (bill.isPaid) {
      return <Badge className="bg-[#4CAF50]">Paid</Badge>;
    }
    
    const today = new Date();
    const dueDate = new Date(bill.dueDate);
    const daysUntilDue = differenceInDays(dueDate, today);
    
    if (daysUntilDue < 0) {
      return <Badge className="bg-[#F44336]">Overdue</Badge>;
    } else if (daysUntilDue <= 3) {
      return <Badge className="bg-[#FF9800]">Due Soon</Badge>;
    } else {
      return <Badge className="bg-[#2196F3]">Upcoming</Badge>;
    }
  };

  // Get due text for a bill
  const getDueText = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  return (
    <>
      <Header title="EMI & Bills" userId={userId} />
      
      <div className="p-4 md:p-6 fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#CCCCCC] font-medium text-sm">Total Upcoming Bills</div>
                <div className="text-[#2196F3]">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="font-mono font-medium text-xl text-white">{formatCurrency(totalUpcomingAmount)}</div>
              <div className="mt-2 text-xs flex items-center text-[#CCCCCC]">
                <span>{upcomingBills?.length || 0} bills due in the next 30 days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#CCCCCC] font-medium text-sm">Past Due Bills</div>
                <div className="text-[#F44336]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
              </div>
              <div className="font-mono font-medium text-xl text-white">
                {formatCurrency(
                  upcomingBills?.filter(bill => differenceInDays(new Date(bill.dueDate), new Date()) < 0)
                    .reduce((sum, bill) => sum + bill.amount, 0) || 0
                )}
              </div>
              <div className="mt-2 text-xs flex items-center text-[#F44336]">
                <span>
                  {upcomingBills?.filter(bill => differenceInDays(new Date(bill.dueDate), new Date()) < 0).length || 0} overdue bills
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#CCCCCC] font-medium text-sm">Recurring Bills</div>
                <div className="text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
                  </svg>
                </div>
              </div>
              <div className="font-mono font-medium text-xl text-white">
                {formatCurrency(
                  bills?.filter(bill => bill.recurring)
                    .reduce((sum, bill) => sum + bill.amount, 0) || 0
                )}
              </div>
              <div className="mt-2 text-xs flex items-center text-[#CCCCCC]">
                <span>{bills?.filter(bill => bill.recurring).length || 0} recurring bills</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#1E1E1E] border-[#2D2D2D] col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-xl font-semibold">EMI & Bills Manager</CardTitle>
              <Button 
                className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bill
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultValue="upcoming" 
                className="w-full"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="bg-[#2D2D2D] text-[#CCCCCC]">
                  <TabsTrigger 
                    value="upcoming" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    All Bills
                  </TabsTrigger>
                  <TabsTrigger 
                    value="paid" 
                    className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#121212]"
                  >
                    Paid
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab} className="mt-4">
                  {isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                      <div className="h-8 bg-[#2D2D2D] rounded w-full mb-4"></div>
                    </div>
                  ) : filteredBills.length > 0 ? (
                    <div className="rounded-md border border-[#2D2D2D]">
                      <Table>
                        <TableHeader className="bg-[#2D2D2D]">
                          <TableRow>
                            <TableHead className="text-[#CCCCCC]">Name</TableHead>
                            <TableHead className="text-[#CCCCCC]">Category</TableHead>
                            <TableHead className="text-[#CCCCCC]">Due Date</TableHead>
                            <TableHead className="text-[#CCCCCC]">Status</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Amount</TableHead>
                            <TableHead className="text-right text-[#CCCCCC]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBills.map((bill) => (
                            <TableRow key={bill.id} className="border-b border-[#2D2D2D]">
                              <TableCell className="font-medium">
                                <div className="text-white">{bill.name}</div>
                                <div className="text-xs text-[#999999]">
                                  {bill.recurring ? `Recurring (${bill.frequency})` : 'One-time'}
                                </div>
                              </TableCell>
                              <TableCell className="text-[#CCCCCC]">{bill.category}</TableCell>
                              <TableCell className="text-[#CCCCCC]">
                                {bill.isPaid ? 'Paid' : getDueText(bill.dueDate.toString())}
                              </TableCell>
                              <TableCell>{getBillStatus(bill)}</TableCell>
                              <TableCell className="text-right font-mono text-white">
                                {formatCurrency(bill.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {!bill.isPaid && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-8 text-[#4CAF50] border-[#4CAF50] hover:bg-[#4CAF50]/10"
                                      onClick={() => markAsPaidMutation.mutate(bill.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-white hover:bg-[#2D2D2D]"
                                    onClick={() => setEditingBill(bill)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-[#CCCCCC] hover:text-[#F44336] hover:bg-[#2D2D2D]"
                                    onClick={() => setDeletingBillId(bill.id)}
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
                      <p className="text-lg mb-2">No {activeTab} bills found</p>
                      <p className="text-sm text-[#999999] mb-4">
                        {activeTab === "upcoming" ? "You have no upcoming bills" : 
                         activeTab === "paid" ? "No bills have been paid yet" :
                         "Start adding your bills to track them"}
                      </p>
                      <Button 
                        className="bg-[#FFD700] text-[#121212] hover:bg-[#E6C200]"
                        onClick={() => setShowAddForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bill
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold">Bill Categories</CardTitle>
              <CardDescription className="text-[#CCCCCC]">
                Breakdown of bills by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tick={{ fill: '#CCCCCC' }} 
                      tickLine={{ stroke: '#2D2D2D' }}
                      axisLine={{ stroke: '#2D2D2D' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fill: '#CCCCCC' }} 
                      tickLine={{ stroke: '#2D2D2D' }}
                      axisLine={{ stroke: '#2D2D2D' }}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ 
                        backgroundColor: '#2D2D2D', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        color: '#F5F5F5'
                      }}
                    />
                    <Bar dataKey="value" name="Amount">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-1">
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

              <Button 
                className="w-full mt-6 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#CCCCCC]"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Bill
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1E1E1E] border-[#2D2D2D] mb-6">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold">Bill Payment Tips</CardTitle>
            <CardDescription className="text-[#CCCCCC]">
              Strategies to manage your bills effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Set Up Auto-Pay</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Avoid late fees by setting up automatic payments for your regular monthly bills.
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
                <h3 className="text-white font-medium">Bill Calendar</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Maintain a dedicated calendar with all your bill due dates to stay organized.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <h3 className="text-white font-medium">Negotiate Rates</h3>
                <p className="text-[#CCCCCC] text-sm">
                  Regularly call service providers to negotiate better rates and reduce monthly bills.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Bill Dialog */}
      <Dialog 
        open={showAddForm || !!editingBill} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingBill(null);
          }
        }}
      >
        <DialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
            <DialogDescription className="text-[#CCCCCC]">
              {editingBill 
                ? 'Update the bill details below.' 
                : 'Add a new bill or EMI to track.'}
            </DialogDescription>
          </DialogHeader>
          
          <BillForm 
            userId={userId}
            bill={editingBill}
            onSuccess={() => {
              setShowAddForm(false);
              setEditingBill(null);
              queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
              queryClient.invalidateQueries({ queryKey: ['/api/bills/upcoming'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBillId} onOpenChange={(open) => !open && setDeletingBillId(null)}>
        <AlertDialogContent className="bg-[#1E1E1E] border-[#2D2D2D] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#CCCCCC]">
              This action cannot be undone. This will permanently delete this bill record from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2D2D2D] text-white hover:bg-[#3D3D3D] border-[#444]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#F44336] text-white hover:bg-red-800"
              onClick={handleDeleteBill}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BillsPage;
