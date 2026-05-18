import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import React, { lazy, Suspense } from "react";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

// Eagerly loaded (lightweight / auth pages)
import Home from "@/pages/Home";
import AgeGate from "@/components/AgeGate";
import SignIn from "@/pages/SignIn";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

// Lazy-loaded heavy pages
const ScentBlock = lazy(() => import("@/pages/ScentBlock"));
const Messages = lazy(() => import("@/pages/Messages"));
const Feed = lazy(() => import("@/pages/Feed"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const AdminReports = lazy(() => import("@/pages/AdminReports"));
const Viewers = lazy(() => import("@/pages/Viewers"));
const Matches = lazy(() => import("@/pages/Matches"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <span className="text-4xl animate-bounce">🤙</span>
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-bounce">🤙</span>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public auth routes */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public pages */}
        <Route element={<Layout />}>
          <Route path="/scent-block" element={<ScentBlock />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/sign-in" replace />} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/help" element={<Help />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/viewers" element={<Viewers />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <AgeGate>
          <Router>
            <AuthenticatedApp />
          </Router>
        </AgeGate>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;