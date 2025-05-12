import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GiHoneycomb } from "react-icons/gi";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use fetch directly for better error handling
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, name, email }),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to register");
      }
      
      toast({
        title: "Success",
        description: "Account created successfully. You can now log in.",
      });
      navigate("/login");
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
            Create a new account to start managing your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username <span className="text-red-500">*</span></Label>
              <Input
                id="username"
                placeholder="Choose a username"
                className="bg-[#333] border-[#444] text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                className="bg-[#333] border-[#444] text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="bg-[#333] border-[#444] text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password <span className="text-red-500">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                className="bg-[#333] border-[#444] text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password <span className="text-red-500">*</span></Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="bg-[#333] border-[#444] text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Register"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <Button
              variant="link"
              className="text-amber-400 p-0"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}