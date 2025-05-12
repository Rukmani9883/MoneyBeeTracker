import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GiHoneycomb } from "react-icons/gi";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting login with:", { username });
      
      // Use fetch directly for better error handling
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      console.log("Login response status:", response.status);
      const data = await response.json();
      console.log("Login response data:", data);
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to login");
      }
      
      // Log additional information from the enhanced response
      if (data.sessionInfo) {
        console.log("Session information received:", data.sessionInfo);
      }
      
      // Force a refetch of the user data from the server
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Wait a moment for the query to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: "Success",
        description: "You have been logged in successfully",
      });
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#121212] p-4">
      <Card className="w-full max-w-md bg-[#1e1e1e] border-[#333] shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <GiHoneycomb size={60} className="text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">MoneyBee</CardTitle>
          <CardDescription className="text-gray-400">
            Login to your account to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                className="bg-[#333] border-[#444] text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="bg-[#333] border-[#444] text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="text-amber-400 p-0"
              onClick={() => navigate("/register")}
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}