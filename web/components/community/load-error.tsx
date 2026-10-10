import { Banner } from '@/components/shared/banner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/toast';

/** A failed read on a member screen: the reason and a retry, announced to screen readers. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <Banner className="self-stretch">{errorMessage(error)}</Banner>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
