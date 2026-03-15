"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
}

export default function NuevaDeudaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isAdmin = (session?.user as any)?.role === "admin";
  const currentUserId = (session?.user as any)?.id;

  const [form, setForm] = useState({
    creditorId: "",
    debtorId: "",
    amount: "",
    description: "",
    currency: "ARS",
  });

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    // Si no es admin, establece el creditor como el usuario actual
    if (!isAdmin && currentUserId) {
      setForm((prev) => ({ ...prev, creditorId: currentUserId }));
    }

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        toast.error("Error al cargar usuarios");
        console.error(error);
      }
    };

    fetchUsers();
  }, [isAdmin, currentUserId, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.creditorId || !form.debtorId || !form.amount) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    if (form.creditorId === form.debtorId) {
      toast.error("El acreedor y deudor deben ser diferentes");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditorId: form.creditorId,
          debtorId: form.debtorId,
          amount: parseInt(form.amount) * 100, // Convert to cents
          currency: form.currency,
          description: form.description || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al crear la deuda");
      }

      toast.success("Deuda registrada correctamente");
      router.push("/dashboard/deudas");
    } catch (error) {
      toast.error("Error al crear la deuda");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nueva Deuda</CardTitle>
          <CardDescription>
            Crea una nueva deuda entre dos usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="creditor">Acreedor (Quién da dinero)</Label>
              {isAdmin ? (
                <Select
                  value={form.creditorId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, creditorId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona acreedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-700">
                  {users.find((u) => u.id === currentUserId)?.username || "Tu usuario"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="debtor">Deudor (Quién debe dinero)</Label>
              <Select
                value={form.debtorId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, debtorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona deudor" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => isAdmin || user.id !== currentUserId)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="100.000"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Pesos Argentinos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Ej: Almuerzo"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Registrar Deuda"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
