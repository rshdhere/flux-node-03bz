import { NextResponse } from "next/server";
import { listRooms } from "@/lib/chat-store";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ rooms: listRooms() });
}
