import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = (session.user as any).role === "admin";

    const searchParams = request.nextUrl.searchParams;
    const filterUserId = searchParams.get("userId");

    const where = isAdmin
      ? {}
      : {
          OR: [{ creditorId: userId }, { debtorId: userId }],
        };

    const debts = await prisma.debt.findMany({
      where,
      include: {
        creditor: true,
        debtor: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get all payments to calculate remaining balance for each debt
    const payments = await prisma.payment.findMany({
      include: {
        from: true,
        to: true,
      },
    });

    // Calculate balance for each debt considering payments
    const debtsWithBalance = debts.map((debt) => {
      let balanceAmount = debt.amount;

      // Find payments from debtor to creditor
      const relevantPayments = payments.filter(
        (p) => p.fromUserId === debt.debtorId && p.toUserId === debt.creditorId
      );

      // Subtract payments from the debt
      relevantPayments.forEach((payment) => {
        if (payment.currency === debt.currency) {
          // Same currency: direct subtraction
          balanceAmount -= payment.amount;
        } else if (debt.currency === "USD" && payment.currency === "ARS" && payment.exchangeRate) {
          // ARS payment towards USD debt: convert using exchange rate
          // exchangeRate is how many ARS per 1 USD
          const usdAmount = Math.floor(payment.amount / payment.exchangeRate);
          balanceAmount -= usdAmount;
        } else if (debt.currency === "ARS" && payment.currency === "USD" && payment.exchangeRate) {
          // USD payment towards ARS debt: convert using exchange rate
          const arsAmount = payment.amount * payment.exchangeRate;
          balanceAmount -= arsAmount;
        }
      });

      return {
        ...debt,
        balanceAmount: Math.max(0, balanceAmount), // Don't show negative balance
      };
    });

    return NextResponse.json(debtsWithBalance);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = (session.user as any).role === "admin";

    const body = await request.json();
    let { creditorId, debtorId, amount, currency, description } = body;

    // Non-admin users can only create debts where they are the creditor
    if (!isAdmin) {
      creditorId = userId;
    }

    if (!creditorId || !debtorId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.create({
      data: {
        creditorId,
        debtorId,
        amount: parseInt(amount),
        currency: currency || "ARS",
        description: description || null,
      },
      include: {
        creditor: true,
        debtor: true,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
