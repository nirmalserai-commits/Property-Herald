import { supabase } from './supabase';

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

const DAUGHTER_MAP: Record<string, string> = {
  neena: 'neena',
  nora: 'nora',
  nita: 'nita',
};

export async function boardroomChat(
  messages: ChatMessage[],
  daughter: Daughter,
  onRetry?: (attempt: number, maxRetries: number) => void,
): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('boardroom-chat', {
        body: { daughter, messages },
      });

      if (error) throw error;
      if (!data || !data.reply) throw new Error('No reply in response');

      return data.reply as string;
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
): Promise<string> {
  const mappedDaughter = DAUGHTER_MAP[daughter] || daughter;

  const apiMessages: ChatMsg[] = summary
    ? [{ role: 'user', content: `[Previous conversation summary: ${summary}]` }, ...messages]
    : messages;

  const maxRetries = 3;
  let fullText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.functions.invoke('boardroom-chat', {
      body: { daughter: mappedDaughter, messages: apiMessages },
    });

    if (error || !data?.reply) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw error ?? new Error('No reply in response');
    }

    fullText = data.reply as string;
    break;
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
): Promise<string> {
  const mappedDaughter = DAUGHTER_MAP[daughter] || daughter;

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const summarizePrompt = `Summarize the key points and decisions from this conversation in 2-3 sentences:\n\n${transcript}`;

  const { data, error } = await supabase.functions.invoke('boardroom-chat', {
    body: {
      daughter: mappedDaughter,
      messages: [{ role: 'user', content: summarizePrompt }],
    },
  });

  if (error) throw error;
  return data?.reply || '';
}
