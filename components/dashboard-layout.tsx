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
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/dashboard/deudas", label: "Deudas", icon: "💳" },
    { href: "/dashboard/pagos", label: "Pagos", icon: "💰" },
    { href: "/dashboard/pagos/nuevo", label: "Registrar Pago", icon: "➕" },
    ...(isAdmin
      ? [
          { href: "/dashboard/deudas/nueva", label: "Nueva Deuda (Admin)", icon: "📝" },
          { href: "/dashboard/admin", label: "Panel Admin", icon: "⚙️" },
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
                className={`block p-2 rounded ${
                  pathname === item.href
                    ? "bg-primary text-white"
                    : "hover:bg-zinc-900"
                }`}
              >
                {item.icon} {item.label}
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
                className={`block p-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-white"
                    : "hover:bg-zinc-900 text-muted-foreground"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
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
