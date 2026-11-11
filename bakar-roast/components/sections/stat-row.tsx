import { cateringStats } from "@/lib/content";
import { Stat } from "@/components/ui/stat";

/** The four fact stats. Two by two on phone, four across on desktop. */
export function StatRow({ windowMonths }: { windowMonths: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {cateringStats(windowMonths).map((s) => (
        <Stat key={s.unit} value={s.value} unit={s.unit} label={s.label} group={s.group ?? true} />
      ))}
    </div>
  );
}
