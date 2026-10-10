'use client';

import type { PersonRow, StudioCommunity } from '@fellow-owners/shared';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSetPersonCommunities } from '@/hooks/queries/use-people';
import { toastSuccess } from '@/lib/toast';

/** Multi-select of the active communities a member belongs to; saving replaces their set. */
export function PersonCommunities({
  person,
  communities,
}: {
  person: PersonRow;
  communities: StudioCommunity[];
}) {
  const active = communities.filter((c) => !c.archivedAt);
  const saved = active
    .filter((c) => person.communities.some((m) => m.slug === c.slug))
    .map((c) => c.id);
  const [picked, setPicked] = useState(saved);
  const save = useSetPersonCommunities();
  const dirty = picked.length !== saved.length || picked.some((id) => !saved.includes(id));

  const toggle = (id: string) =>
    setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { membershipId: person.membershipId, communityIds: picked },
          { onSuccess: () => toastSuccess(`${person.name}'s communities are updated.`) },
        );
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Communities for {person.name}</legend>
        {active.map((c) => (
          <label key={c.id} className="flex min-h-10 items-center gap-3 text-body text-ink">
            <input
              type="checkbox"
              checked={picked.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="size-5 shrink-0 rounded-sm"
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <p aria-live="polite" className="mt-2 text-small text-ink-muted">
        {picked.length === 0 ? 'Pick at least one community.' : null}
      </p>
      <Button
        type="submit"
        variant="secondary"
        icon={<Check />}
        loading={save.isPending}
        disabled={!dirty || picked.length === 0}
        className="mt-2"
      >
        Save communities
      </Button>
    </form>
  );
}
