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
    const { fromUserId, toUserId, amount, comment, receiptUrl, date } = body;

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
        comment: comment || null,
        receiptUrl: receiptUrl || null,
        date: new Date(date),
      },
      include: {
        from: true,
        to: true,
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
