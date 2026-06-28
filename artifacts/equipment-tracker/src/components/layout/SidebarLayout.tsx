import * as React from "react";
import { Link, useLocation } from "wouter";
import { Map, LayoutDashboard, Server, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./ThemeProvider";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Map View", href: "/map", icon: Map },
    { name: "Equipment", href: "/equipment", icon: Server },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col h-full flex-shrink-0">
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
      <main className="flex-1 overflow-y-auto flex flex-col h-full">
        {children}
      </main>
    </div>
  );
}
