import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import EquipmentList from "./pages/EquipmentList";
import EquipmentDetail from "./pages/EquipmentDetail";
import Settings from "./pages/Settings";
import ScanPage from "./pages/ScanPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public scan page — no sidebar */}
      <Route path="/scan/:token" component={ScanPage} />

      {/* App pages with sidebar */}
      <Route>
        <SidebarLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/map" component={MapPage} />
            <Route path="/equipment" component={EquipmentList} />
            <Route path="/equipment/:id" component={EquipmentDetail} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </SidebarLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
