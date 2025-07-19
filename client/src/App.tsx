import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallBanner } from "@/components/install-button";
import { authApi, setAuthToken, getAuthToken, removeAuthToken } from "@/lib/auth";
import AuthPage from "@/pages/auth";
import ChatPage from "@/pages/chat";
import BackendPreview from "@/pages/backend-preview";
import Demo from "@/pages/demo";

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for special modes first - before any other logic
  const urlParams = new URLSearchParams(window.location.search);
  const showBackend = urlParams.get('backend') === 'true';
  const showDemo = urlParams.get('demo') === 'true';

  // Return special modes immediately
  if (showBackend) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <BackendPreview />
          </div>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (showDemo) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Demo />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  useEffect(() => {

    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Check if we already have a valid token
        const existingToken = getAuthToken();
        if (existingToken) {
          setAuthToken(existingToken);
          try {
            const profile = await authApi.getProfile();
            setIsAuth(true);
            setIsLoading(false);
            return;
          } catch (error) {
            // Token is invalid, continue to login
            removeAuthToken();
          }
        }
      } catch (error) {
        removeAuthToken();
      }

      try {
        // Try auto-login with admin credentials
        const response = await authApi.login({
          username: "admin",
          password: "admin123"
        });
        setAuthToken(response.token);
        setIsAuth(true);
        console.log("Admin login successful");
      } catch (error) {
        console.log("Auto-login failed, trying testuser:", error);
        try {
          const response = await authApi.login({
            username: "testuser",
            password: "password123"
          });
          setAuthToken(response.token);
          setIsAuth(true);
          console.log("Testuser login successful");
        } catch (fallbackError) {
          console.log("Fallback login failed:", fallbackError);
          setIsAuth(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    setIsAuth(false);
  };



  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Starting WizSpeek®...</p>
            </div>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-screen bg-background">
          {isAuth ? (
            <ChatPage onLogout={handleLogout} />
          ) : (
            <AuthPage onSuccess={handleAuthSuccess} />
          )}
        </div>
        <InstallBanner />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;