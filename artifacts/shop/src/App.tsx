import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { getCustomerSession, getAdminSession } from "@/lib/auth";
import { useEffect } from "react";
import { LanguageProvider } from "@/lib/i18n";
import React from "react";

import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import Liked from "@/pages/Liked";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import CourierApp from "@/pages/CourierApp";

import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import Products from "@/pages/admin/Products";
import Categories from "@/pages/admin/Categories";
import Banners from "@/pages/admin/Banners";
import Delivery from "@/pages/admin/Delivery";
import AdminOrders from "@/pages/admin/AdminOrders";
import Customers from "@/pages/admin/Customers";
import AdminChat from "@/pages/admin/AdminChat";
import Notifications from "@/pages/admin/Notifications";
import Settings from "@/pages/admin/Settings";
import AdminCouriers from "@/pages/admin/AdminCouriers";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";

// Inject auth headers on every /api request
const _originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input instanceof Request ? input.url : input.toString());
  if (url.startsWith("/api") || url.includes("/api/")) {
    const headers = new Headers((init?.headers as HeadersInit) || (input instanceof Request ? input.headers : {}));
    const customerId = localStorage.getItem("customerId");
    if (customerId) headers.set("x-customer-id", customerId);
    const courierId = localStorage.getItem("courierId");
    if (courierId) headers.set("x-courier-id", courierId);
    init = { ...init, headers };
  }
  return _originalFetch(input, init);
};

function CustomerRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const session = getCustomerSession();
  useEffect(() => { if (!session) setLocation("/login"); }, []);
  if (!session) return null;
  return <CustomerLayout><Component /></CustomerLayout>;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const isAdmin = getAdminSession();
  useEffect(() => { if (!isAdmin) setLocation("/admin/login"); }, []);
  if (!isAdmin) return null;
  return <AdminLayout><Component /></AdminLayout>;
}

function AdminRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/admin/dashboard"); }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/courier" component={CourierApp} />
      <Route path="/" component={() => <CustomerRoute component={Home} />} />
      <Route path="/product/:id" component={() => <CustomerRoute component={ProductDetail} />} />
      <Route path="/cart" component={() => <CustomerRoute component={Cart} />} />
      <Route path="/checkout" component={() => <CustomerRoute component={Checkout} />} />
      <Route path="/orders" component={() => <CustomerRoute component={Orders} />} />
      <Route path="/liked" component={() => <CustomerRoute component={Liked} />} />
      <Route path="/chat" component={() => <CustomerRoute component={Chat} />} />
      <Route path="/profile" component={() => <CustomerRoute component={Profile} />} />
      <Route path="/admin" component={AdminRedirect} />
      <Route path="/admin/dashboard" component={() => <AdminRoute component={Dashboard} />} />
      <Route path="/admin/products" component={() => <AdminRoute component={Products} />} />
      <Route path="/admin/categories" component={() => <AdminRoute component={Categories} />} />
      <Route path="/admin/banners" component={() => <AdminRoute component={Banners} />} />
      <Route path="/admin/delivery" component={() => <AdminRoute component={Delivery} />} />
      <Route path="/admin/orders" component={() => <AdminRoute component={AdminOrders} />} />
      <Route path="/admin/customers" component={() => <AdminRoute component={Customers} />} />
      <Route path="/admin/chat" component={() => <AdminRoute component={AdminChat} />} />
      <Route path="/admin/notifications" component={() => <AdminRoute component={Notifications} />} />
      <Route path="/admin/settings" component={() => <AdminRoute component={Settings} />} />
      <Route path="/admin/couriers" component={() => <AdminRoute component={AdminCouriers} />} />
      <Route path="/admin/promo-codes" component={() => <AdminRoute component={AdminPromoCodes} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
