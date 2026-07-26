import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Attachment {
  url: string;
  path?: string;
  name: string;
  type: string;
  kind: 'image' | 'file';
  size: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  attachments?: Attachment[];
}

export type ChatMsg = ChatMessage;

export type Daughter = 'neena' | 'nora' | 'nita';

const EDGE_FUNCTION_URL =
  'https://llbbdebjvnypoxcfsajl.supabase.co/functions/v1/boardroom-chat';

interface BoardRoomResponse {
  reply?: string;
  error?: string;
}

async function callBoardRoom(
  message: string,
  persona: string,
  conversationHistory: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message,
      persona,
      conversationHistory,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Board-Room error ${res.status}: ${text}`);
  }

  const data: BoardRoomResponse = await res.json();
  if (!data.reply) throw new Error(data.error || 'No reply in response');
  return data.reply;
}

function toHistory(messages: ChatMsg[]): { role: string; content: string }[] {
  return messages.map((m) => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content,
  }));
}

export async function boardroomChat(
  messages: ChatMessage[],
  daughter: Daughter,
  onRetry?: (attempt: number, maxRetries: number) => void,
  _client: SupabaseClient = supabase,
): Promise<string> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) throw new Error('No message provided');

  const history = toHistory(messages.slice(0, -1));
  const message = lastMessage.content;

  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callBoardRoom(message, daughter, history);
    } catch (err) {
      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, maxRetries);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('All retries exhausted');
}

export async function boardroomChatStream(
  messages: ChatMsg[],
  daughter: string,
  summary: string | null,
  onChunk: (chunk: string) => void,
  _client: SupabaseClient = supabase,
): Promise<string> {
  const apiMessages: ChatMsg[] = summary
    ? [{ role: 'user', content: `[Previous conversation summary: ${summary}]` }, ...messages]
    : messages;

  const history = toHistory(apiMessages.slice(0, -1));
  const lastMessage = apiMessages[apiMessages.length - 1];
  if (!lastMessage) throw new Error('No message provided');

  const maxRetries = 3;
  let fullText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      fullText = await callBoardRoom(lastMessage.content, daughter, history);
      break;
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error('No reply from Board-Room');
    }
  }

  const words = fullText.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = i === 0 ? words[i] : ' ' + words[i];
    onChunk(chunk);
    await new Promise((r) => setTimeout(r, 20));
  }

  return fullText;
}

export async function boardroomSummarize(
  messages: ChatMsg[],
  daughter: string,
  _client: SupabaseClient = supabase,
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const summarizePrompt = `Summarize the key points and decisions from this conversation in 2-3 sentences:\n\n${transcript}`;

  const history = toHistory(messages);
  return callBoardRoom(summarizePrompt, daughter, history);
}
