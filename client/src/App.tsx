import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Income from "@/pages/Income";
import Expenses from "@/pages/Expenses";
import Savings from "@/pages/Savings";
import Vault from "@/pages/Vault";
import Debt from "@/pages/Debt";
import Bills from "@/pages/Bills";
import { useState } from "react";

function App() {
  const [location] = useLocation();
  const [userId] = useState(1); // Using a fixed user ID for this demo

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-[#121212] text-white">
          <Sidebar activePath={location} />
          
          <main className="flex-1 md:ml-64 min-h-screen bg-[#121212]">
            <Switch>
              <Route path="/" component={() => <Dashboard userId={userId} />} />
              <Route path="/dashboard" component={() => <Dashboard userId={userId} />} />
              <Route path="/income" component={() => <Income userId={userId} />} />
              <Route path="/expenses" component={() => <Expenses userId={userId} />} />
              <Route path="/savings" component={() => <Savings userId={userId} />} />
              <Route path="/vault" component={() => <Vault userId={userId} />} />
              <Route path="/debt" component={() => <Debt userId={userId} />} />
              <Route path="/bills" component={() => <Bills userId={userId} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
