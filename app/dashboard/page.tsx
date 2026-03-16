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
        where: {
          status: {
            notIn: ["paid", "completed"],
          },
        },
        include: {
          creditor: true,
          debtor: true,
        },
      })
    : await prisma.debt.findMany({
        where: {
          AND: [
            {
              OR: [{ creditorId: userId }, { debtorId: userId }],
            },
            {
              status: {
                notIn: ["paid", "completed"],
              },
            },
          ],
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

  // Calculate balances between users by currency
  const balances: Record<
    string,
    {
      otherUserId: string;
      otherUsername: string;
      balancesByCurrency: Record<
        string,
        number // Positive if current user owes, negative if other owes current user
      >;
    }
  > = {};

  users.forEach((user: typeof users[0]) => {
    if (user.id !== userId || isAdmin) {
      const otherUserId = user.id;
      const otherUsername = user.username;
      const balancesByCurrency: Record<string, number> = {};

      // Get user debts
      const userDebts = debts.filter((d: typeof debts[0]) => {
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
      });

      // Calculate balance for each debt (without subtracting payments)
      userDebts.forEach((d: typeof userDebts[0]) => {
        const sign = d.debtorId === userId ? 1 : -1;
        // Only use the original debt amount, don't subtract payments
        const balanceAmount = d.amount;

        // Add net balance to total (without considering payments)
        balancesByCurrency[d.currency] = (balancesByCurrency[d.currency] || 0) + balanceAmount * sign;
      });

      // Only add if there's any balance
      if (Object.values(balancesByCurrency).some((b) => b !== 0)) {
        balances[otherUserId] = {
          otherUserId,
          otherUsername,
          balancesByCurrency,
        };
      }
    }
  });

  const balanceEntries = Object.values(balances);

  // Calculate average exchange rate from payments
  const paymentsWithExchangeRate = payments.filter((p: typeof payments[0]) => p.exchangeRate);
  const averageExchangeRate = paymentsWithExchangeRate.length > 0
    ? paymentsWithExchangeRate.reduce((sum: number, p: typeof paymentsWithExchangeRate[0]) => sum + (p.exchangeRate || 0), 0) /
      paymentsWithExchangeRate.length
    : 1000; // Default fallback rate if no payments with exchange rate

  // Calculate totals by currency
  const totals: Record<string, { owed: number; credits: number }> = {
    ARS: { owed: 0, credits: 0 },
    USD: { owed: 0, credits: 0 },
  };

  balanceEntries.forEach((balance: typeof balanceEntries[0]) => {
    Object.entries(balance.balancesByCurrency).forEach(([currency, amount]: [string, number]) => {
      if (amount > 0) {
        totals[currency].owed += amount;
      } else {
        totals[currency].credits += Math.abs(amount);
      }
    });
  });

  // Calculate totals in USD (for net balance)
  const totalOwedInUSD = (totals.ARS.owed / averageExchangeRate) + totals.USD.owed;
  const totalCreditsInUSD = (totals.ARS.credits / averageExchangeRate) + totals.USD.credits;
  const netBalanceInUSD = totalOwedInUSD - totalCreditsInUSD;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Resumen General - Main Summary */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Resumen General</h2>
          
          {/* Main Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Debés en ARS */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide">Debés (ARS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {formatCurrency(totals.ARS.owed)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pesos
                </p>
              </CardContent>
            </Card>

            {/* Debés en USD */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide">Debés (USD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {formatCurrency(totals.USD.owed)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dólares
                </p>
              </CardContent>
            </Card>

            {/* Te Deben en ARS */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide">Te Deben (ARS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(totals.ARS.credits)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Pesos
                </p>
              </CardContent>
            </Card>

            {/* Te Deben en USD */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide">Te Deben (USD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(totals.USD.credits)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dólares
                </p>
              </CardContent>
            </Card>

            {/* Balance Neto en USD */}
            <Card className="lg:col-span-1 lg:row-span-1 border-2 border-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-amber-500">Balance Neto (USD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  netBalanceInUSD > 0 ? "text-red-500" : "text-green-500"
                }`}>
                  {formatCurrency(Math.abs(netBalanceInUSD))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {netBalanceInUSD > 0 ? "Debés" : "Te deben"}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Cotización: ${averageExchangeRate.toFixed(2)} ARS/USD
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detalles por Moneda */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Detalles por Moneda</h2>
          
          {/* Deudas en Pesos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">ARS</span>
                Deudas en Pesos Argentinos
              </CardTitle>
              <CardDescription>
                Detalles de deudas pendientes en pesos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balanceEntries.filter((b) => (b.balancesByCurrency.ARS || 0) !== 0).length === 0 ? (
                <p className="text-muted-foreground">Sin deudas en pesos</p>
              ) : (
                <div className="space-y-3">
                  {balanceEntries
                    .filter((b) => (b.balancesByCurrency.ARS || 0) !== 0)
                    .map((balance) => {
                      const amount = balance.balancesByCurrency.ARS || 0;
                      return (
                        <div
                          key={`${balance.otherUserId}-ARS`}
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-800"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{balance.otherUsername}</p>
                          </div>
                          <Badge
                            variant={amount > 0 ? "destructive" : "secondary"}
                          >
                            {amount > 0 ? "Debés" : "Te Deben"} {formatCurrency(Math.abs(amount))}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deudas en Dólares */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">USD</span>
                Deudas en Dólares Estadounidenses
              </CardTitle>
              <CardDescription>
                Detalles de deudas pendientes en dólares
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balanceEntries.filter((b) => (b.balancesByCurrency.USD || 0) !== 0).length === 0 ? (
                <p className="text-muted-foreground">Sin deudas en dólares</p>
              ) : (
                <div className="space-y-3">
                  {balanceEntries
                    .filter((b) => (b.balancesByCurrency.USD || 0) !== 0)
                    .map((balance) => {
                      const amount = balance.balancesByCurrency.USD || 0;
                      return (
                        <div
                          key={`${balance.otherUserId}-USD`}
                          className="flex items-center justify-between p-3 rounded-lg border border-zinc-800"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{balance.otherUsername}</p>
                          </div>
                          <Badge
                            variant={amount > 0 ? "destructive" : "secondary"}
                          >
                            {amount > 0 ? "Debés" : "Te Deben"} {formatCurrency(Math.abs(amount))}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
