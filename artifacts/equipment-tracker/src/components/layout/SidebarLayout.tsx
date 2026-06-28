import * as React from "react";
import { Link, useLocation } from "wouter";
import { Map, LayoutDashboard, Server, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Map View", href: "/map", icon: Map },
  { name: "Equipment", href: "/equipment", icon: Server },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [location] = useLocation();

  return (
      <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex w-64 border-r bg-card flex-col h-full flex-shrink-0">
          <div className="h-16 flex items-center px-6 border-b">
            <div className="flex items-center gap-2 text-primary font-bold text-lg uppercase tracking-wider">
              <div className="w-4 h-4 bg-primary rounded-sm" />
              FieldTrack
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Mobile header */}
          <div className="md:hidden flex items-center px-4 h-12 border-b bg-card flex-shrink-0">
            <div className="flex items-center gap-2 text-primary font-bold text-base uppercase tracking-wider">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              FieldTrack
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

          {/* Mobile bottom nav — hidden on desktop */}
          <nav
            className="md:hidden flex border-t bg-card flex-shrink-0"
            data-testid="mobile-bottom-nav"
          >
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
  );
}
