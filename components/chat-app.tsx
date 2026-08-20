"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MessageCircle, Send, Users, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatRoom } from "@/lib/chat-store";

const NAME_KEY = "flux-chat-display-name";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ChatApp() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameReady, setNameReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(NAME_KEY);
    if (saved) {
      setDisplayName(saved);
      setNameReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      try {
        const response = await fetch("/api/rooms");
        if (!response.ok) {
          throw new Error("Failed to load rooms");
        }
        const data = (await response.json()) as { rooms: ChatRoom[] };
        if (!cancelled) {
          setRooms(data.rooms);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load chat rooms.");
        }
      }
    }

    void loadRooms();
    const timer = window.setInterval(() => {
      void loadRooms();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!nameReady) {
      return;
    }

    const source = new EventSource(
      `/api/messages/stream?roomId=${encodeURIComponent(activeRoomId)}`,
    );

    source.addEventListener("open", () => {
      setConnected(true);
      setError(null);
    });

    source.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        messages: ChatMessage[];
      };
      setMessages(data.messages);
    });

    source.addEventListener("message", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        message: ChatMessage;
      };
      setMessages((current) => {
        if (current.some((item) => item.id === data.message.id)) {
          return current;
        }
        return [...current, data.message];
      });
    });

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [activeRoomId, nameReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeRoomId]);

  function saveName(event: FormEvent) {
    event.preventDefault();
    const cleaned = displayName.trim().slice(0, 32);
    if (!cleaned) {
      setError("Choose a display name to join.");
      return;
    }
    window.localStorage.setItem(NAME_KEY, cleaned);
    setDisplayName(cleaned);
    setNameReady(true);
    setError(null);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          author: displayName,
          body,
        }),
      });

      const data = (await response.json()) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error ?? "Failed to send message");
      }

      setMessages((current) => {
        if (current.some((item) => item.id === data.message!.id)) {
          return current;
        }
        return [...current, data.message!];
      });
      setDraft("");
      draftRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (!nameReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
        <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/90 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <MessageCircle aria-hidden className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Flux Chat</h1>
          <p className="mt-2 text-[var(--muted)]">
            Join a live room, pick a name, and start messaging.
          </p>
          <form className="mt-8 space-y-4" onSubmit={saveName}>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[var(--text)]">Display name</span>
              <Input
                autoFocus
                maxLength={32}
                placeholder="e.g. Maya"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            {error ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Enter chat
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Flux Chat
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {activeRoom?.name ?? "Chat"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {activeRoom?.description ?? "Live messaging rooms"}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/80 px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 text-[var(--muted)]">
            {connected ? (
              <Wifi aria-hidden className="h-4 w-4 text-[var(--success)]" />
            ) : (
              <WifiOff aria-hidden className="h-4 w-4 text-[var(--danger)]" />
            )}
            {connected ? "Live" : "Reconnecting"}
          </span>
          <span className="h-4 w-px bg-[var(--border)]" aria-hidden />
          <button
            className="rounded-lg px-2 py-1 text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
            type="button"
            onClick={() => {
              window.localStorage.removeItem(NAME_KEY);
              setNameReady(false);
            }}
          >
            {displayName}
          </button>
        </div>
      </header>

      <div className="grid min-h-[70vh] flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/85 p-3 shadow-[var(--shadow)]">
          <div className="mb-3 flex items-center gap-2 px-2 text-sm font-medium text-[var(--muted)]">
            <Users aria-hidden className="h-4 w-4" />
            Rooms
          </div>
          <nav aria-label="Chat rooms" className="space-y-1">
            {rooms.map((room) => {
              const active = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  className={cn(
                    "flex w-full flex-col rounded-2xl px-3 py-3 text-left transition",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--text)]"
                      : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]",
                  )}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{room.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        active
                          ? "bg-white/15 text-[var(--text)]"
                          : "bg-white/5 text-[var(--muted)]",
                      )}
                    >
                      {room.messageCount}
                    </span>
                  </span>
                  <span className="mt-0.5 text-xs opacity-80">
                    {room.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/90 shadow-[var(--shadow)]">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-64 items-center justify-center text-sm text-[var(--muted)]">
                No messages yet — say the first hello.
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.author === displayName;
                return (
                  <article
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      mine ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        mine
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-panel)] text-[var(--accent-strong)]",
                      )}
                    >
                      {initials(message.author) || "?"}
                    </div>
                    <div
                      className={cn(
                        "max-w-[min(100%,34rem)] rounded-2xl px-3.5 py-2.5",
                        mine
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border)] bg-[var(--bg-panel)]",
                      )}
                    >
                      <div className="mb-1 flex items-baseline gap-2 text-xs">
                        <span
                          className={cn(
                            "font-semibold",
                            mine ? "text-white" : "text-[var(--text)]",
                          )}
                        >
                          {message.author}
                        </span>
                        <time
                          className={cn(
                            mine ? "text-white/75" : "text-[var(--muted)]",
                          )}
                          dateTime={message.createdAt}
                        >
                          {formatTime(message.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {message.body}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-[var(--border)] bg-[var(--bg-panel)]/70 p-3 sm:p-4"
            onSubmit={sendMessage}
          >
            {error ? (
              <p className="mb-2 text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input
                ref={draftRef}
                aria-label="Message"
                maxLength={2000}
                placeholder={`Message #${activeRoom?.name?.toLowerCase() ?? "room"}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                aria-label="Send message"
                className="shrink-0 px-4"
                disabled={sending || !draft.trim()}
                type="submit"
              >
                <Send aria-hidden className="h-4 w-4" />
                Send
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
