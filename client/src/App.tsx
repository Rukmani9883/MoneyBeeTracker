import { Switch, Route, useLocation, useRoute, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Income from "@/pages/Income";
import Expenses from "@/pages/Expenses";
import Savings from "@/pages/Savings";
import Vault from "@/pages/Vault";
import Bills from "@/pages/Bills";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AnimationProvider } from "@/components/animations/AnimationProvider";

// Protected route component
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [match] = useRoute("/login");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated && !match) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
};

function App() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  return (
    <TooltipProvider>
      <AnimationProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-[#121212] text-white">
          {isAuthenticated && <Sidebar activePath={location} />}
          
          <main className={`flex-1 ${isAuthenticated ? 'md:ml-64' : ''} min-h-screen bg-[#121212]`}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/" component={() => isAuthenticated ? <Dashboard userId={userId} /> : <Redirect to="/login" />} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} userId={userId} />} />
              <Route path="/income" component={() => <ProtectedRoute component={Income} userId={userId} />} />
              <Route path="/expenses" component={() => <ProtectedRoute component={Expenses} userId={userId} />} />
              <Route path="/savings" component={() => <ProtectedRoute component={Savings} userId={userId} />} />
              <Route path="/vault" component={() => <ProtectedRoute component={Vault} userId={userId} />} />
              <Route path="/bills" component={() => <ProtectedRoute component={Bills} userId={userId} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        <Toaster />
      </AnimationProvider>
    </TooltipProvider>
  );
}

export default App;
