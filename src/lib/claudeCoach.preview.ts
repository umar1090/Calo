import type { AssistantContext } from '@/engine/assistant/assistant';
import type { ChatMessage } from './store/schema';
export { CLAUDE_MODEL } from './claudeModel';

/** Stand-in used by the hosted preview build, where calls to outside services are blocked. */
export class ClaudeCoachError extends Error {}

export async function askClaude(_opts: { apiKey: string; ctx: AssistantContext; history: ChatMessage[]; message: string; onText: (s: string) => void; signal?: AbortSignal }): Promise<string> {
  void _opts;
  throw new ClaudeCoachError('Claude mode is not available in this preview.');
}
