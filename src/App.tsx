// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

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
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

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

        <Route
          path="/view/:id"
          element={
            <ProtectedRoute>
              <TiptapView />
            </ProtectedRoute>
          }
        />

        <Route element={<AppLayout />}>
          <Route path="/explore" element={<Explore />} />
          <Route path="/history" element={<History />} />
          <Route path="/create" element={<Create />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/guide" element={<Guide />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>

    {/*</TooltipProvider> */}
  </QueryClientProvider>
);

export default App;
