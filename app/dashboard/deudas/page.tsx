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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  comment?: string;
  status: string;
  date: string;
}

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
  balanceAmount: number;
  totalPaid: number;
  currency: string;
  description?: string;
  status: string;
  date: string;
  payments: Payment[];
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
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const userId = session?.user?.id || "";
  const isAdmin = (session?.user as any)?.role === "admin";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [debtsRes, usersRes, paymentsRes] = await Promise.all([
        fetch(`/api/debts?userId=${userId}&isAdmin=${isAdmin}`),
        fetch("/api/users"),
        fetch("/api/payments"),
      ]);

      const debtsData = await debtsRes.json();
      const usersData = await usersRes.json();
      const paymentsData = await paymentsRes.json();

      setDebts(debtsData);
      setUsers(usersData);
      setAvailablePayments(paymentsData);
    } catch (error) {
      toast.error("Error al cargar los datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentsDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowPaymentsDialog(true);
  };

  const handleAssignPayment = async (paymentId: string, debtId: string) => {
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          debtId,
        }),
      });

      if (!res.ok) throw new Error("Error asignando pago");

      toast.success("Pago asignado correctamente");
      fetchData();
      setShowPaymentsDialog(false);
    } catch (error) {
      toast.error("Error al asignar pago");
      console.error(error);
    }
  };

  const handleChangeStatus = async (debtId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch("/api/debts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Error actualizando estado");

      toast.success("Estado actualizado");
      fetchData();
    } catch (error) {
      toast.error("Error al actualizar estado");
      console.error(error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta deuda?")) {
      return;
    }

    try {
      const res = await fetch("/api/debts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId,
        }),
      });

      if (!res.ok) throw new Error("Error eliminando deuda");

      toast.success("Deuda eliminada");
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar deuda");
      console.error(error);
    }
  };

  const filteredDebts = selectedUser && selectedUser !== "all"
    ? debts.filter(
        (d) => d.creditor.id === selectedUser || d.debtor.id === selectedUser
      )
    : debts;

  const getUnassignedPayments = () => {
    if (!selectedDebt) return [];
    return availablePayments.filter(
      (p) =>
        p.fromUserId === selectedDebt.debtor.id &&
        p.toUserId === selectedDebt.creditor.id &&
        (!p.debtId || p.status === "pending")
    );
  };

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
                      <TableHead>Monto Original</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Saldo Pendiente</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Acciones</TableHead>
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
                        <TableCell>
                          <Badge variant="secondary">
                            {formatCurrency(debt.totalPaid)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              debt.balanceAmount === 0
                                ? "default"
                                : "destructive"
                            }
                          >
                            {formatCurrency(debt.balanceAmount)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{debt.currency}</Badge>
                        </TableCell>
                        <TableCell>
                          {userId === debt.creditor.id || isAdmin ? (
                            <Select
                              value={debt.status}
                              onValueChange={(value) =>
                                handleChangeStatus(debt.id, value)
                              }
                              disabled={updatingStatus}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  Pendiente
                                </SelectItem>
                                <SelectItem value="partial">Parcial</SelectItem>
                                <SelectItem value="paid">Pagada</SelectItem>
                                <SelectItem value="completed">
                                  Finalizado
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                debt.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : debt.status === "paid"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {debt.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {debt.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(userId === debt.creditor.id || isAdmin) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPaymentsDialog(debt)}
                              >
                                Asignar Pago
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteDebt(debt.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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

      <Dialog open={showPaymentsDialog} onOpenChange={setShowPaymentsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar Pagos a Deuda</DialogTitle>
            <DialogDescription>
              {selectedDebt && (
                <>
                  Deudor: <strong>{selectedDebt.debtor.username}</strong> - Monto:{" "}
                  <strong>{formatCurrency(selectedDebt.amount)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {getUnassignedPayments().length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay pagos sin asignar
              </p>
            ) : (
              getUnassignedPayments().map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {formatCurrency(payment.amount)} {payment.currency}
                    </p>
                    {payment.comment && (
                      <p className="text-xs text-muted-foreground">
                        Comentario: {payment.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(payment.date))}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleAssignPayment(payment.id, selectedDebt!.id)
                    }
                  >
                    Asignar
                  </Button>
                </div>
              ))
            )}

            {selectedDebt?.payments && selectedDebt.payments.length > 0 && (
              <>
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">
                    Pagos Asignados
                  </h4>
                  {selectedDebt.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between bg-green-50 rounded-lg p-3 mb-2"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {formatCurrency(payment.amount)} {payment.currency}
                        </p>
                        {payment.comment && (
                          <p className="text-xs text-muted-foreground">
                            {payment.comment}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-green-100">
                        Asignado
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
