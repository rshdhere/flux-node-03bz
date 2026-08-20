import { NextRequest, NextResponse } from "next/server";
import { addMessage, listMessages } from "@/lib/chat-store";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId") ?? "general";
  const after = request.nextUrl.searchParams.get("after") ?? undefined;
  return NextResponse.json({ messages: listMessages(roomId, after) });
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { roomId, author, body } = payload as {
    roomId?: unknown;
    author?: unknown;
    body?: unknown;
  };

  if (
    typeof roomId !== "string" ||
    typeof author !== "string" ||
    typeof body !== "string"
  ) {
    return NextResponse.json(
      { error: "roomId, author, and body are required strings" },
      { status: 400 },
    );
  }

  const result = addMessage({ roomId, author, body });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result }, { status: 201 });
}
