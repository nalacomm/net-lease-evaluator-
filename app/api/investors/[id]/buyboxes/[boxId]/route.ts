import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; boxId: string } }
) {
  try {
    const body = await req.json();
    const box = await prisma.buyBox.findFirst({
      where: { id: params.boxId, investorId: params.id },
    });
    if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.buyBox.update({
      where: { id: params.boxId },
      data: {
        name: body.name ?? box.name,
        appliesTo: body.appliesTo ?? box.appliesTo,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; boxId: string } }
) {
  try {
    const box = await prisma.buyBox.findFirst({
      where: { id: params.boxId, investorId: params.id },
    });
    if (!box) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.buyBox.delete({ where: { id: params.boxId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
