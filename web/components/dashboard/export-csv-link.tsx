import type { ExportKind } from '@fellow-owners/shared';
import { Download, Ellipsis } from 'lucide-react';
import { exportUrl } from '@/api/insights';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Menu, MenuContent, MenuLinkItem, MenuTrigger } from '@/components/ui/menu';

/** The toolbar "Export CSV" download for one list (the API names the file and sends the BOM). */
export function ExportCsvLink({ kind }: { kind: ExportKind }) {
  return (
    <a
      href={exportUrl(kind)}
      download
      className={buttonVariants({ variant: 'secondary', surface: 'glass', size: 'md' })}
    >
      <Download aria-hidden="true" className="size-5" />
      Export CSV
    </a>
  );
}

/** The same download tucked into a "…" overflow menu, so the toolbar keeps one clear action. */
export function ExportCsvMenu({ kind }: { kind: ExportKind }) {
  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="secondary" surface="glass" aria-label="More actions" />}
      >
        <Ellipsis aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuLinkItem href={exportUrl(kind)} download icon={<Download />}>
          Export CSV
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}
