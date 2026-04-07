"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAppFeedback } from "@/services/feedback.service";
import { CheckCircle2, MessageSquareQuote } from "lucide-react";

interface PostOrderFeedbackProps {
  orderId: string;
}

export function PostOrderFeedback({ orderId }: PostOrderFeedbackProps) {
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReopenCue, setShowReopenCue] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= 4000;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      if (!submitted) {
        setShowReopenCue(true);
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      await submitAppFeedback({ message: trimmed, orderId });
      setSubmitted(true);
      setMessage("");
      setShowReopenCue(false);
    } catch (err) {
      toast.error("Could not send feedback", {
        description: err instanceof Error ? err.message : "Try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeAfterThanks = () => {
    setOpen(false);
    setShowReopenCue(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[min(100vw-2rem,26rem)] rounded-2xl border-charcoal/10 sm:max-w-lg">
          {submitted ? (
            <>
              <DialogHeader>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </div>
                <DialogTitle className="text-center font-display text-xl text-charcoal">
                  Thank you!
                </DialogTitle>
                <DialogDescription className="text-center text-pretty text-charcoal/70">
                  Your note helps us improve the ordering experience for everyone.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 font-display"
                  onClick={closeAfterThanks}
                >
                  Got it
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                  <MessageSquareQuote className="h-6 w-6" aria-hidden />
                </div>
                <DialogTitle className="text-center font-display text-xl text-charcoal">
                  Tell us how we did
                </DialogTitle>
                <DialogDescription className="text-center text-pretty text-charcoal/70">
                  Quick feedback on using this site — what worked, what was confusing, or what we should improve.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order-feedback" className="font-display">
                    Your feedback
                  </Label>
                  <Textarea
                    id="order-feedback"
                    name="feedback"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Checkout was easy — would love clearer pickup times…"
                    rows={4}
                    maxLength={4000}
                    className="min-h-[100px] resize-y text-charcoal"
                    disabled={loading}
                  />
                  <p className="text-xs text-charcoal/50">
                    {trimmed.length} / 4000 characters · optional
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-display min-h-11 sm:min-w-0"
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    Maybe later
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="min-h-12 font-display sm:min-w-[140px]"
                    disabled={!canSubmit || loading}
                  >
                    {loading ? "Sending…" : "Send feedback"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {showReopenCue && !submitted && (
        <div className="mx-auto mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-display border-charcoal/20 text-charcoal"
            onClick={() => {
              setOpen(true);
              setShowReopenCue(false);
            }}
          >
            <MessageSquareQuote className="mr-2 h-4 w-4" aria-hidden />
            Tell us how we did
          </Button>
        </div>
      )}
    </>
  );
}
