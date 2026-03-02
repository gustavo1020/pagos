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

    return NextResponse.json(debts);
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

    const isAdmin = (session.user as any).role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create debts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { creditorId, debtorId, amount, description, date } = body;

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
        description: description || null,
        date: new Date(date),
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
