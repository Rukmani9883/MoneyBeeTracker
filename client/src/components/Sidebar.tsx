import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  activePath: string;
}

const Sidebar = ({ activePath }: SidebarProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST"
      });
      
      toast({
        title: "Success",
        description: "You have been logged out successfully",
      });
      
      // Invalidate the query client by navigating
      navigate("/login");
      
      // Force reload to clear the query cache
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const showSettingsToast = () => {
    toast({
      title: "Settings",
      description: "Settings functionality is not implemented in this demo",
      variant: "default",
    });
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" && activePath === "/") return true;
    return activePath === path;
  };

  return (
    <aside className="bg-[#1E1E1E] w-full md:w-64 md:fixed md:h-screen flex flex-col z-10 border-r border-[#2D2D2D]">
      <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-center md:justify-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#FFD700] mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 7.337C13.8037 6.4954 15.1161 6.4431 16.5 7.5596V3C16.5 2.44772 16.9477 2 17.5 2H18.5C19.0523 2 19.5 2.44772 19.5 3V7.5596C20.8839 6.4431 22.1963 6.4954 23 7.337C23.8037 8.17861 23.8037 9.52139 23 10.363L15.5 18.2525V22H13.5V18.2525L6 10.363C5.19626 9.52139 5.19626 8.17861 6 7.337C6.80374 6.4954 8.11611 6.4431 9.5 7.5596V3C9.5 2.44772 9.94772 2 10.5 2H11.5C12.0523 2 12.5 2.44772 12.5 3V7.5596C13.8839 6.4431 15.1963 6.4954 16 7.337L13 10.5L11.5 9.05025L4 17V22H2V16.5C2 16.2239 2.22386 16 2.5 16H3.5C3.77614 16 4 16.2239 4 16.5V18.5858L6 16.5858V14.5C6 14.2239 6.22386 14 6.5 14H7.5C7.77614 14 8 14.2239 8 14.5V14.5858L10 12.5858V10.5C10 10.2239 10.2239 10 10.5 10H11.5C11.7761 10 12 10.2239 12 10.5V10.5858L13 9.55025L14 8.5L13 7.337Z"></path>
        </svg>
        <h1 className="text-xl font-bold text-white">MoneyBee</h1>
      </div>
      
      <nav className="py-4 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto gap-1 px-2">
        <Link href="/dashboard" 
          className={`flex items-center p-3 rounded-lg ${isActive("/dashboard") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} mb-1 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Dashboard</span>
        </Link>
        
        <Link href="/income"
          className={`flex items-center p-3 rounded-lg ${isActive("/income") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} mb-1 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Income</span>
        </Link>
        
        <Link href="/expenses"
          className={`flex items-center p-3 rounded-lg ${isActive("/expenses") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} mb-1 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
          <span>Expenses</span>
        </Link>
        
        <Link href="/savings"
          className={`flex items-center p-3 rounded-lg ${isActive("/savings") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} mb-1 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m5 0h1M9 11h1m5 0h1M9 15h1m5 0h1"></path>
          </svg>
          <span>Savings</span>
        </Link>
        
        <Link href="/vault"
          className={`flex items-center p-3 rounded-lg ${isActive("/vault") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} mb-1 transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="12" cy="10" r="3"></circle>
            <path d="M12 13v4"></path>
            <path d="M7 13h10"></path>
          </svg>
          <span>Vault</span>
        </Link>
        
        <Link href="/bills"
          className={`flex items-center p-3 rounded-lg ${isActive("/bills") ? "bg-[#2D2D2D] text-[#FFD700]" : "hover:bg-[#2D2D2D] text-white hover:text-[#FFD700]"} transition-colors`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>EMI & Bills</span>
        </Link>
      </nav>
      
      <div className="mt-auto p-4 border-t border-[#2D2D2D]">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-[#2D2D2D] flex items-center justify-center text-[#FFD700]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium text-white">{user?.username || "User"}</p>
            <p className="text-xs text-[#999999]">{user?.email || "MoneyBee User"}</p>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <button 
              className="text-[#999999] hover:text-[#FFD700]"
              onClick={showSettingsToast}
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
              </svg>
            </button>
            
            <button 
              className="text-[#999999] hover:text-red-500"
              onClick={handleLogout}
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
