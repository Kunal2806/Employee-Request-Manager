import { db } from "@/db";
import { employeeRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['accepted', 'denied', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'accepted', 'denied', or 'pending'" },
      );
    }

    const updatedRequest = await db
      .update(employeeRequest)
      .set({ status })
      .where(eq(employeeRequest.id, id))
      .returning();

    return NextResponse.json(updatedRequest[0]);
  } catch (error) {
    console.error("Error updating holiday request:", error);
    return NextResponse.json(
      { error: "Failed to update request" }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db
      .delete(employeeRequest)
      .where(eq(employeeRequest.id, id))
      .returning();

    return NextResponse.json(
      { message: "Request deleted successfully", id },
    );
  } catch (error) {
    console.error("Error deleting holiday request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
    );
  }
}