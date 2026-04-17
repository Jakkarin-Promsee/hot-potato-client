// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { RequireLogin } from "./components/RequireLogin";

import TipTapCanvas from "./pages/TipTapCanvas";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import TiptapView from "./pages/TiptapView";
import Status from "./pages/Status";
import CloudinaryUpload from "./pages/Cloudinaryupload";
import Explore from "./pages/Explore";
import { AppLayout } from "./layouts/AppLayout";
import Profile from "./pages/Profile";
import Settings from "./pages/Setting";
import Guide from "./pages/Guide";
import History from "./pages/History";
import Create from "./pages/Create";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* <TooltipProvider>
      <Toaster />
      <Sonner /> */}

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/status" element={<Status />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/canvas/:id"
          element={
            <ProtectedRoute>
              <TipTapCanvas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/uploadimage"
          element={
            <ProtectedRoute>
              <CloudinaryUpload />
            </ProtectedRoute>
          }
        />

        {/* Public read-only view (optional auth on API for public / link-only) */}
        <Route path="/view/:id" element={<TiptapView />} />

        <Route element={<AppLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/explore" element={<Explore />} />
          <Route path="/guide" element={<Guide />} />
          <Route
            path="/history"
            element={
              <RequireLogin
                title="Sign in to view history"
                description="Your learning history is tied to your account. Log in to see lessons you’ve opened and continue where you left off."
              >
                <History />
              </RequireLogin>
            }
          />
          <Route
            path="/create"
            element={
              <RequireLogin
                title="Sign in to create"
                description="Create and manage your lessons from your personal library. Log in to get started."
              >
                <Create />
              </RequireLogin>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireLogin
                title="Sign in to view your profile"
                description="Your profile and account details are available after you log in."
              >
                <Profile />
              </RequireLogin>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireLogin
                title="Sign in to open settings"
                description="Account and app preferences are available to signed-in users only."
              >
                <Settings />
              </RequireLogin>
            }
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>

    {/*</TooltipProvider> */}
  </QueryClientProvider>
);

export default App;
