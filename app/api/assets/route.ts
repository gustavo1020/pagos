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

    const where = isAdmin ? {} : { userId };

    const assets = await prisma.asset.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(assets);
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
    const { description, amount, currency, category, comment } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.create({
      data: {
        userId,
        description,
        amount: parseInt(amount),
        currency: currency || "ARS",
        category: category || null,
        comment: comment || null,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
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
    const body = await request.json();
    const { assetId, description, amount, currency, category, comment } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: "Missing assetId" },
        { status: 400 }
      );
    }

    // Get asset to verify ownership
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Only the owner or admin can update
    const isAdmin = (session.user as any).role === "admin";
    if (!isAdmin && asset.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        description: description || asset.description,
        amount: amount ? parseInt(amount) : asset.amount,
        currency: currency || asset.currency,
        category: category !== undefined ? category : asset.category,
        comment: comment !== undefined ? comment : asset.comment,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(updatedAsset);
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

    const userId = session.user.id;
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: "Missing assetId" },
        { status: 400 }
      );
    }

    // Get asset to verify ownership
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Only the owner or admin can delete
    const isAdmin = (session.user as any).role === "admin";
    if (!isAdmin && asset.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.asset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
