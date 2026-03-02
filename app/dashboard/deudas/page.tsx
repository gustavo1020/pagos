"use client";

import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Debt {
  id: string;
  creditor: {
    id: string;
    username: string;
  };
  debtor: {
    id: string;
    username: string;
  };
  amount: number;
  description?: string;
  date: string;
}

interface User {
  id: string;
  username: string;
}

export default function DebtasPage() {
  const { data: session } = useSession();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const userId = session?.user?.id || "";
  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [debtsRes, usersRes] = await Promise.all([
        fetch(`/api/debts?userId=${userId}&isAdmin=${isAdmin}`),
        fetch("/api/users"),
      ]);

      const debtsData = await debtsRes.json();
      const usersData = await usersRes.json();

      setDebts(debtsData);
      setUsers(usersData);
    } catch (error) {
      toast.error("Error al cargar las deudas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDebts = selectedUser && selectedUser !== "all"
    ? debts.filter(
        (d) => d.creditor.id === selectedUser || d.debtor.id === selectedUser
      )
    : debts;

  if (loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Cargando deudas...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Deudas</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Todas las deudas registradas"
                : "Tus deudas y créditos"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredDebts.length === 0 ? (
              <p className="text-muted-foreground">Sin deudas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acreedor</TableHead>
                      <TableHead>Deudor</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell>
                          {formatDate(new Date(debt.date))}
                        </TableCell>
                        <TableCell className="font-medium">
                          {debt.creditor.username}
                        </TableCell>
                        <TableCell>{debt.debtor.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatCurrency(debt.amount)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {debt.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
