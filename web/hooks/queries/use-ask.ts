import { useMutation } from '@tanstack/react-query';
import { askAi } from '@/lib/api/ask';

/** Ask your AI (F13): one question in, an answer with checked citations out. 429 at the daily cap. */
export function useAsk() {
  return useMutation({ mutationFn: askAi });
}
