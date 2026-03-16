"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogOut,
  Menu,
  LayoutDashboard,
  CreditCard,
  DollarSign,
  Wallet,
  Plus,
  FileText,
  Settings,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/deudas", label: "Deudas", Icon: CreditCard },
    { href: "/dashboard/pagos", label: "Pagos", Icon: DollarSign },
    { href: "/dashboard/activos", label: "Dónde está su plata", Icon: Wallet },
    { href: "/dashboard/pagos/nuevo", label: "Registrar Pago", Icon: Plus },
    { href: "/dashboard/deudas/nueva", label: "Nueva Deuda", Icon: FileText },
    ...(isAdmin
      ? [
          { href: "/dashboard/admin", label: "Panel Admin", Icon: Settings },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Pagos</h1>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name}
              {isAdmin && " (Admin)"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-zinc-800 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center p-2 rounded ${
                  pathname === item.href
                    ? "bg-primary text-white"
                    : "hover:bg-zinc-900"
                }`}
              >
                <item.Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </nav>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto">
        {/* Sidebar */}
        <div className="hidden md:block md:col-span-1">
          <nav className="space-y-2 sticky top-28">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-white"
                    : "hover:bg-zinc-900 text-muted-foreground"
                }`}
              >
                <item.Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content */}
        <main className="md:col-span-3">{children}</main>
      </div>
    </div>
  );
}
