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
        payments: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Return debts with payment information included (no automatic subtraction)
    const debtsWithPayments = debts.map((debt: typeof debts[0]) => {
      // Calculate total paid from assigned payments
      const totalPaid = debt.payments.reduce((sum: number, payment) => {
        if (payment.currency === debt.currency) {
          return sum + payment.amount;
        } else if (debt.currency === "USD" && payment.currency === "ARS" && payment.exchangeRate) {
          const usdAmount = Math.floor(payment.amount / payment.exchangeRate);
          return sum + usdAmount;
        } else if (debt.currency === "ARS" && payment.currency === "USD" && payment.exchangeRate) {
          const arsAmount = payment.amount * payment.exchangeRate;
          return sum + arsAmount;
        }
        return sum;
      }, 0);

      return {
        ...debt,
        balanceAmount: debt.amount - totalPaid,
        totalPaid,
      };
    });

    return NextResponse.json(debtsWithPayments);
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
        payments: true,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = (session.user as any).role === "admin";
    const body = await request.json();
    const { debtId, status } = body;

    if (!debtId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get debt to verify authorization
    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: {
        creditor: true,
        debtor: true,
        payments: true,
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    // Only creditor or admin can change debt status
    if (!isAdmin && debt.creditorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedDebt = await prisma.debt.update({
      where: { id: debtId },
      data: { status },
      include: {
        creditor: true,
        debtor: true,
        payments: true,
      },
    });

    return NextResponse.json(updatedDebt);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === "admin";
    
    // Only admins can delete debts
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can delete debts" }, { status: 403 });
    }

    const body = await request.json();
    const { debtId } = body;

    if (!debtId) {
      return NextResponse.json(
        { error: "Missing debtId" },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    await prisma.debt.delete({
      where: { id: debtId },
    });

    return NextResponse.json({ message: "Debt deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
