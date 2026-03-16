import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isAdmin = (session.user as any).role === "admin";
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Get all users
  const users = await prisma.user.findMany();

  // Get all debts and payments
  const allDebts = await prisma.debt.findMany({
    include: {
      creditor: true,
      debtor: true,
    },
  });

  const allPayments = await prisma.payment.findMany({
    include: {
      from: true,
      to: true,
    },
  });

  // Calculate balances between each pair of users
  const balanceMatrix: Record<
    string,
    Record<
      string,
      {
        debts: number;
        payments: number;
        net: number;
      }
    >
  > = {};

  // Initialize matrix
  users.forEach((user1: typeof users[0]) => {
    balanceMatrix[user1.id] = {};
    users.forEach((user2: typeof users[0]) => {
      if (user1.id !== user2.id) {
        balanceMatrix[user1.id][user2.id] = {
          debts: 0,
          payments: 0,
          net: 0,
        };
      }
    });
  });

  // Fill in debts
  allDebts.forEach((debt: typeof allDebts[0]) => {
    if (balanceMatrix[debt.debtorId] && balanceMatrix[debt.debtorId][debt.creditorId]) {
      balanceMatrix[debt.debtorId][debt.creditorId].debts += debt.amount;
      balanceMatrix[debt.debtorId][debt.creditorId].net += debt.amount;
    }
  });

  // Fill in payments
  allPayments.forEach((payment: typeof allPayments[0]) => {
    if (balanceMatrix[payment.fromUserId] && balanceMatrix[payment.fromUserId][payment.toUserId]) {
      balanceMatrix[payment.fromUserId][payment.toUserId].payments += payment.amount;
      balanceMatrix[payment.fromUserId][payment.toUserId].net -= payment.amount;
    }
  });

  // Calculate summary statistics
  const totalDebtsAmount = allDebts.reduce((sum: number, d: typeof allDebts[0]) => sum + d.amount, 0);
  const totalPaymentsAmount = allPayments.reduce((sum: number, p: typeof allPayments[0]) => sum + p.amount, 0);
  const outstandingAmount = totalDebtsAmount - totalPaymentsAmount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Deudas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {formatCurrency(totalDebtsAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {allDebts.length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(totalPaymentsAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {allPayments.length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Deuda Pendiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(outstandingAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sin liquidar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Balance Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Balances</CardTitle>
            <CardDescription>
              Balance neto entre cada par de usuarios (Fila debe a Columna)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-2 font-semibold">Usuario</th>
                    {users.map((user: typeof users[0]) => (
                      <th key={user.id} className="text-center p-2 text-xs">
                        {user.username.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user1: typeof users[0]) => (
                    <tr key={user1.id} className="border-b border-zinc-800">
                      <td className="p-2 font-medium">{user1.username}</td>
                      {users.map((user2: typeof users[0]) => {
                        if (user1.id === user2.id) {
                          return (
                            <td key={user2.id} className="text-center p-2">
                              <span className="text-muted-foreground">-</span>
                            </td>
                          );
                        }
                        const balance = balanceMatrix[user1.id][user2.id];
                        const isOwed = balance.net < 0;
                        return (
                          <td key={user2.id} className="text-center p-2">
                            <Badge
                              variant={isOwed ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {formatCurrency(Math.abs(balance.net))}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Rojo = debe | Azul = le deben
            </p>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas transacciones del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Últimas Deudas Registradas</h3>
                {allDebts.slice(-5).map((debt: typeof allDebts[0]) => (
                  <div key={debt.id} className="text-sm p-2 rounded bg-zinc-900/50 mb-2">
                    <p>
                      <span className="font-medium">{debt.creditor.username}</span> →{" "}
                      <span className="font-medium">{debt.debtor.username}</span>:{" "}
                      <span className="text-blue-400">
                        {formatCurrency(debt.amount)}
                      </span>
                    </p>
                    {debt.description && (
                      <p className="text-xs text-muted-foreground">{debt.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Últimos Pagos Realizados</h3>
                {allPayments.slice(-5).map((payment: typeof allPayments[0]) => (
                  <div key={payment.id} className="text-sm p-2 rounded bg-zinc-900/50 mb-2">
                    <p>
                      <span className="font-medium">{payment.from.username}</span> →{" "}
                      <span className="font-medium">{payment.to.username}</span>:{" "}
                      <span className="text-green-400">
                        {formatCurrency(payment.amount)}
                      </span>
                    </p>
                    {payment.comment && (
                      <p className="text-xs text-muted-foreground">{payment.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
