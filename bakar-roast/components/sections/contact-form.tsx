"use client";

import { useRef, useState, type FormEvent } from "react";
import { brand, eventTypes, waLink } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Banner } from "@/components/ui/banner";

type Form = { name: string; phone: string; occasion: string; date: string; guests: string; message: string };
type Errors = Partial<Record<"name" | "phone", string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Add your name so we know who is asking.";
  if (f.phone.replace(/\D/g, "").length < 7) e.phone = "Add a phone number we can reach you on.";
  return e;
}

/**
 * The "just chatting" path: no backend. Composes a WhatsApp message and opens wa.me.
 * Validates on submit (and re-checks a field once it has an error), then focuses the first
 * invalid field so its linked message is read out.
 */
export function ContactForm() {
  const [form, setForm] = useState<Form>({
    name: "",
    phone: "",
    occasion: eventTypes[0],
    date: "",
    guests: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: validate(next)[key as keyof Errors] }));
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.phone) return phoneRef.current?.focus();
    const lines = [
      `Hi ${brand.name}, I would like to ask about catering.`,
      "",
      `Name: ${form.name.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Occasion: ${form.occasion}`,
      `Date: ${form.date || "Not sure yet"}`,
      form.guests ? `Guests: ${form.guests}` : "",
      form.message.trim() ? `Notes: ${form.message.trim()}` : "",
    ].filter(Boolean);
    window.open(waLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field ref={nameRef} label="Name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <Field
          ref={phoneRef}
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={set("phone")}
          error={errors.phone}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField label="Occasion" value={form.occasion} onChange={set("occasion")}>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
        <Field label="Date" type="date" optional value={form.date} onChange={set("date")} />
        <Field label="Guests" type="number" inputMode="numeric" min={1} optional value={form.guests} onChange={set("guests")} />
      </div>
      <TextareaField label="Anything else" optional rows={4} value={form.message} onChange={set("message")} />
      <div className="grid justify-items-start gap-4">
        <Button type="submit" variant="cream">
          Send on WhatsApp
        </Button>
        {sent && (
          <Banner tone="ok" title="WhatsApp is opening with your message." className="w-full">
            If nothing happened, message us on {brand.whatsappDisplay}.
          </Banner>
        )}
      </div>
    </form>
  );
}
