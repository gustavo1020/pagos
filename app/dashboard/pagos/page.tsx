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
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Link as LinkIcon } from "lucide-react";

interface Payment {
  id: string;
  from: {
    id: string;
    username: string;
  };
  to: {
    id: string;
    username: string;
  };
  amount: number;
  comment?: string;
  receiptUrl?: string;
  date: string;
}

interface User {
  id: string;
  username: string;
}

export default function PagosPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
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
      const [paymentsRes, usersRes] = await Promise.all([
        fetch(`/api/payments?userId=${userId}&isAdmin=${isAdmin}`),
        fetch("/api/users"),
      ]);

      const paymentsData = await paymentsRes.json();
      const usersData = await usersRes.json();

      setPayments(paymentsData);
      setUsers(usersData);
    } catch (error) {
      toast.error("Error al cargar los pagos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = selectedUser && selectedUser !== "all"
    ? payments.filter((p) => p.from.id === selectedUser || p.to.id === selectedUser)
    : payments;

  if (loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Cargando pagos...</p>
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
            <CardTitle>Pagos Realizados</CardTitle>
            <CardDescription>
              {isAdmin ? "Todos los pagos registrados" : "Tus pagos"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full sm:w-[200px]">
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

            {filteredPayments.length === 0 ? (
              <p className="text-muted-foreground">Sin pagos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Comentario</TableHead>
                      <TableHead>Comprobante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {formatDate(new Date(payment.date))}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.from.username}
                        </TableCell>
                        <TableCell>{payment.to.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatCurrency(payment.amount)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.comment || "-"}
                        </TableCell>
                        <TableCell>
                          {payment.receiptUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
