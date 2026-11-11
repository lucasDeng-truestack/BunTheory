import { Suspense } from "react";
import { CalendarScreen } from "@/components/admin/calendar-screen";

export default function AdminCalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
    </Suspense>
  );
}
