import { supabase } from './supabase';

export type Daughter = 'nora' | 'nita';
export type ChatRole = 'user' | 'assistant';

export interface StoredMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

const SESSION_KEY = (d: Daughter) => `ph_chat_session_${d}`;

function getSessionId(daughter: Daughter): string {
  let id = localStorage.getItem(SESSION_KEY(daughter));
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY(daughter), id);
  }
  return id;
}

export function resetSession(daughter: Daughter): string {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY(daughter), id);
  return id;
}

export async function loadChatHistory(daughter: Daughter): Promise<StoredMessage[]> {
  const sessionId = getSessionId(daughter);
  const { data, error } = await supabase
    .from('boardroom_chats')
    .select('id, role, content, created_at')
    .eq('daughter_name', daughter)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn(`loadChatHistory(${daughter}) failed:`, error.message);
    return [];
  }
  return (data ?? []) as StoredMessage[];
}

export async function saveMessage(
  daughter: Daughter,
  role: ChatRole,
  content: string,
): Promise<void> {
  const sessionId = getSessionId(daughter);
  const { error } = await supabase.from('boardroom_chats').insert({
    daughter_name: daughter,
    role,
    content,
    session_id: sessionId,
  });
  if (error) console.warn(`saveMessage(${daughter}) failed:`, error.message);
}
