import { PosMenuItem } from '@/types/pos';

export interface SectionHeaderGroup {
  title: string;
  subtitle: string | null;
  /** Best-effort sort key from subsection header metadata. */
  sortOrder: number;
  items: PosMenuItem[];
}

/**
 * Group items by staff-defined subsection headings (`sectionHeader`).
 * Preserve global order by header sort, then row sort within each group.
 */
export function groupItemsBySectionHeader(
  items: PosMenuItem[],
  defaultTitle = 'Menu',
): SectionHeaderGroup[] {
  const sorted = [...items].sort((a, b) => {
    const ha = a.sectionHeader?.sortOrder ?? 10_000;
    const hb = b.sectionHeader?.sortOrder ?? 10_000;
    if (ha !== hb) return ha - hb;
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  });

  const groups: SectionHeaderGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of sorted) {
    const header = item.sectionHeader;
    const title = header?.title?.trim() || defaultTitle;
    const subtitle = header?.subtitle ?? null;
    const sortOrder = header?.sortOrder ?? 10_000;
    const key = header?.id ?? `ungrouped:${title}:${sortOrder}`;

    let i = indexByKey.get(key);
    if (i === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ title, subtitle, sortOrder, items: [item] });
    } else {
      groups[i].items.push(item);
    }
  }

  groups.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  return groups;
}
