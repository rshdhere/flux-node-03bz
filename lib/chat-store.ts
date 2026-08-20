export type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type ChatRoom = {
  id: string;
  name: string;
  description: string;
  messageCount: number;
};

type Listener = (message: ChatMessage) => void;

const roomDefs: Omit<ChatRoom, "messageCount">[] = [
  {
    id: "general",
    name: "General",
    description: "Say hello and hang out",
  },
  {
    id: "design",
    name: "Design",
    description: "UI, typography, and visuals",
  },
  {
    id: "shipping",
    name: "Shipping",
    description: "Builds, deploys, and demos",
  },
];

const messages: ChatMessage[] = [
  {
    id: "welcome-1",
    roomId: "general",
    author: "Flux",
    body: "Welcome to Flux Chat — pick a room and start talking.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "welcome-2",
    roomId: "general",
    author: "Flux",
    body: "Messages sync live for everyone connected to this server.",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "design-1",
    roomId: "design",
    author: "Flux",
    body: "Drop layout ideas, color notes, or component feedback here.",
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "shipping-1",
    roomId: "shipping",
    author: "Flux",
    body: "Share what you shipped today.",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const listeners = new Set<Listener>();

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listRooms(): ChatRoom[] {
  return roomDefs.map((room) => ({
    ...room,
    messageCount: messages.filter((message) => message.roomId === room.id)
      .length,
  }));
}

export function getRoom(roomId: string): ChatRoom | undefined {
  return listRooms().find((room) => room.id === roomId);
}

export function listMessages(roomId: string, afterId?: string): ChatMessage[] {
  const roomMessages = messages.filter((message) => message.roomId === roomId);
  if (!afterId) {
    return roomMessages;
  }
  const index = roomMessages.findIndex((message) => message.id === afterId);
  if (index === -1) {
    return roomMessages;
  }
  return roomMessages.slice(index + 1);
}

export function addMessage(input: {
  roomId: string;
  author: string;
  body: string;
}): ChatMessage | { error: string } {
  const room = getRoom(input.roomId);
  if (!room) {
    return { error: "Room not found" };
  }

  const author = input.author.trim().slice(0, 32);
  const body = input.body.trim().slice(0, 2000);

  if (!author) {
    return { error: "Display name is required" };
  }
  if (!body) {
    return { error: "Message cannot be empty" };
  }

  const message: ChatMessage = {
    id: createId(),
    roomId: input.roomId,
    author,
    body,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  if (messages.length > 500) {
    messages.splice(0, messages.length - 500);
  }

  for (const listener of listeners) {
    listener(message);
  }

  return message;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
