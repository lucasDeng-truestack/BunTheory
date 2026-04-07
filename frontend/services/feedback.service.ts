import { api } from "@/lib/api";

export interface AppFeedbackRow {
  id: string;
  message: string;
  orderId: string | null;
  createdAt: string;
  order: { slugId: string; customerName: string } | null;
}

export async function submitAppFeedback(payload: {
  message: string;
  orderId?: string;
}): Promise<{ id: string; createdAt: string }> {
  return api<{ id: string; createdAt: string }>("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listAppFeedback(token: string): Promise<AppFeedbackRow[]> {
  return api<AppFeedbackRow[]>("/feedback", { token });
}
