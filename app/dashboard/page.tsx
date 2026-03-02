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
import { Badge } from "@/components/ui/badge";
import { formatCurrency, calculateBalance, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const isAdmin = (session.user as any).role === "admin";

  // Get all users
  const users = await prisma.user.findMany();

  // Get all debts and payments involving this user (or all if admin)
  const debts = isAdmin
    ? await prisma.debt.findMany({
        include: {
          creditor: true,
          debtor: true,
        },
      })
    : await prisma.debt.findMany({
        where: {
          OR: [{ creditorId: userId }, { debtorId: userId }],
        },
        include: {
          creditor: true,
          debtor: true,
        },
      });

  const payments = isAdmin
    ? await prisma.payment.findMany({
        include: {
          from: true,
          to: true,
        },
      })
    : await prisma.payment.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        include: {
          from: true,
          to: true,
        },
      });

  // Calculate balances between users
  const balances: Record<
    string,
    {
      otherUserId: string;
      otherUsername: string;
      amountOwed: number; // Positive if current user owes, negative if other owes current user
    }
  > = {};

  users.forEach((user) => {
    if (user.id !== userId || isAdmin) {
      const otherUserId = user.id;
      const otherUsername = user.username;

      const userDebts = debts
        .filter((d) => {
          if (isAdmin) {
            return (
              (d.creditorId === userId && d.debtorId === otherUserId) ||
              (d.debtorId === userId && d.creditorId === otherUserId)
            );
          } else {
            return (
              (d.creditorId === userId && d.debtorId === otherUserId) ||
              (d.debtorId === userId && d.creditorId === otherUserId)
            );
          }
        })
        .reduce((sum, d) => {
          if (d.debtorId === userId) return sum + d.amount;
          return sum - d.amount;
        }, 0);

      const userPayments = payments
        .filter((p) => {
          if (isAdmin) {
            return (
              (p.fromUserId === userId && p.toUserId === otherUserId) ||
              (p.toUserId === userId && p.fromUserId === otherUserId)
            );
          } else {
            return (
              (p.fromUserId === userId && p.toUserId === otherUserId) ||
              (p.toUserId === userId && p.fromUserId === otherUserId)
            );
          }
        })
        .reduce((sum, p) => {
          if (p.fromUserId === userId) return sum + p.amount;
          return sum - p.amount;
        }, 0);

      const balance = userDebts + userPayments;
      if (balance !== 0) {
        balances[otherUserId] = {
          otherUserId,
          otherUsername,
          amountOwed: balance,
        };
      }
    }
  });

  const balanceEntries = Object.values(balances);

  const totalOwed = balanceEntries
    .filter((b) => b.amountOwed > 0)
    .reduce((sum, b) => sum + b.amountOwed, 0);

  const totalCredits = balanceEntries
    .filter((b) => b.amountOwed < 0)
    .reduce((sum, b) => sum + Math.abs(b.amountOwed), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Debés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(totalOwed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de deudas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Te Deben</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(totalCredits)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de créditos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalOwed > totalCredits ? "text-red-500" : "text-green-500"
                }`}
              >
                {formatCurrency(Math.abs(totalOwed - totalCredits))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalOwed > totalCredits ? "Debes" : "Te deben"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Balances with Users */}
        <Card>
          <CardHeader>
            <CardTitle>Balance por Usuario</CardTitle>
            <CardDescription>
              Deuda neta con cada persona
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceEntries.length === 0 ? (
              <p className="text-muted-foreground">Sin transacciones</p>
            ) : (
              <div className="space-y-4">
                {balanceEntries.map((balance) => (
                  <div
                    key={balance.otherUserId}
                    className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{balance.otherUsername}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          balance.amountOwed > 0 ? "destructive" : "secondary"
                        }
                      >
                        {balance.amountOwed > 0 ? "Debés" : "Te Deben"}{" "}
                        {formatCurrency(Math.abs(balance.amountOwed))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
