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

    const userId = session.user.id;
    const isAdmin = (session.user as any).role === "admin";

    const body = await request.json();
    let { creditorId, debtorId, amount, description, date } = body;

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
