import { NextRequest } from "next/server";
import { listMessages, subscribe, type ChatMessage } from "@/lib/chat-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId") ?? "general";
  const encoder = new TextEncoder();

  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("snapshot", { messages: listMessages(roomId) });

      unsubscribe = subscribe((message: ChatMessage) => {
        if (message.roomId !== roomId) {
          return;
        }
        send("message", { message });
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        unsubscribe();
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      });
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
