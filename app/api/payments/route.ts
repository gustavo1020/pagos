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

    const where = isAdmin
      ? {}
      : {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        from: true,
        to: true,
        debt: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(payments);
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
    const body = await request.json();
    const { fromUserId, toUserId, amount, currency, exchangeRate, comment, receiptUrl } = body;

    // Users can only create payments from themselves
    if (fromUserId !== userId && (session.user as any).role !== "admin") {
      return NextResponse.json(
        { error: "You can only pay from your own account" },
        { status: 403 }
      );
    }

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        fromUserId,
        toUserId,
        amount: parseInt(amount),
        currency: currency || "ARS",
        exchangeRate: exchangeRate || null,
        comment: comment || null,
        receiptUrl: receiptUrl || null,
        status: "pending",
      },
      include: {
        from: true,
        to: true,
        debt: true,
      },
    });

    // Create notification for the creditor (recipient) about the payment
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: "payment_received",
        title: "Nuevo Pago Recibido",
        message: `${payment.from.username} ha registrado un pago de ${payment.amount} ${payment.currency}`,
        paymentId: payment.id,
      },
    });

    return NextResponse.json(payment, { status: 201 });
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
    const { paymentId, debtId, status } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Missing paymentId" },
        { status: 400 }
      );
    }

    // Get payment to verify authorization
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        from: true,
        to: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Only the creditor (toUserId/payee) or admin can assign/update payment
    if (!isAdmin && payment.toUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};
    
    if (debtId !== undefined) {
      updateData.debtId = debtId || null;
      if (!debtId) {
        updateData.status = "pending";
      } else {
        updateData.status = "assigned";
      }
    }
    
    if (status !== undefined) {
      updateData.status = status;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        from: true,
        to: true,
        debt: true,
      },
    });

    // Create notification for the payer when payment is assigned to a debt
    if (debtId && !payment.debtId) {
      await prisma.notification.create({
        data: {
          userId: payment.fromUserId,
          type: "payment_assigned",
          title: "Pago Asignado",
          message: `Tu pago de ${payment.amount} ${payment.currency} ha sido asignado a una deuda`,
          paymentId: paymentId,
          debtId: debtId,
        },
      });
    }

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
