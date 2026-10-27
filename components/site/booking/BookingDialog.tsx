"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getLenis } from "../motion/SmoothScroll";
import {
  COURSES,
  MEMBERSHIP_OPTIONS,
  TRIAL_COURSES,
  type BookingFormValues,
  bookingSchema,
  buildBookingPayload,
  courseValue,
} from "./payload";
import type { BookingPreset } from "../SiteShell";

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Buchungsformular (B.6.10): neue Optik (Glas dunkel, Unterstrich-Felder),
 * Logik 1:1 aus payload.ts. Fokusfalle, ESC schließt, Lenis pausiert.
 */
export function BookingDialog({
  preset,
  onClose,
}: {
  preset: BookingPreset | null;
  onClose: () => void;
}) {
  const open = preset !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      intent: preset?.intent ?? "",
      course: preset?.course ?? "",
      membership: preset?.membership ?? "",
      date: "",
      message: preset?.message ?? "",
    },
  });

  const intent = watch("intent");
  const course = watch("course");

  const courseOptions = intent === "probetraining" ? TRIAL_COURSES : COURSES;
  const memberships = useMemo(
    () =>
      intent === "mitgliedschaft" && course
        ? (MEMBERSHIP_OPTIONS[course] ?? [])
        : [],
    [intent, course],
  );

  // Vorauswahl übernehmen, wenn der Dialog neu geöffnet wird
  useEffect(() => {
    if (!open) return;
    reset({
      name: "",
      email: "",
      phone: "",
      intent: preset?.intent ?? "",
      course: preset?.course ?? "",
      membership: preset?.membership ?? "",
      date: "",
      message: preset?.message ?? "",
    });
    setSent(false);
    setError(null);
  }, [open, preset, reset]);

  // Lenis pausieren, ESC, Fokusfalle
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    document.body.style.overflow = "hidden";

    const prevFocus = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (data: BookingFormValues) => {
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBookingPayload(data)),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Fehler beim Senden");
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
      );
    }
  };

  return (
    <div className="sl-modal-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="sl-modal sl-glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sl-booking-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sl-modal-head">
          <h2 id="sl-booking-title" className="sl-modal-title">
            Jetzt buchen
          </h2>
          <button
            type="button"
            className="sl-modal-close"
            onClick={onClose}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {sent ? (
          <div className="sl-modal-done">
            <p className="sl-lead">Vielen Dank!</p>
            <p>
              Wir haben dir eine Bestätigung per E-Mail geschickt. Wir melden
              uns in Kürze bei dir!
            </p>
            <button
              type="button"
              className="sl-btn sl-btn-primary"
              onClick={onClose}
            >
              Schließen
            </button>
          </div>
        ) : (
          <form
            className="sl-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {error ? (
              <p className="sl-form-error" role="alert">
                {error}
              </p>
            ) : null}

            <fieldset className="sl-field">
              <legend className="sl-readout">Anliegen *</legend>
              <div className="sl-choice-grid">
                {[
                  {
                    v: "probetraining",
                    t: "Probetraining",
                    s: "Unverbindlich reinschnuppern",
                  },
                  {
                    v: "mitgliedschaft",
                    t: "Mitgliedschaft anfragen",
                    s: "Dauerhaft dabei",
                  },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`sl-choice${intent === o.v ? " is-active" : ""}`}
                    aria-pressed={intent === o.v}
                    onClick={() => {
                      setValue("intent", o.v, { shouldValidate: true });
                      setValue("course", "");
                      setValue("membership", "");
                    }}
                  >
                    <span className="sl-choice-title">{o.t}</span>
                    <span className="sl-readout">{o.s}</span>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register("intent")} />
              {errors.intent ? (
                <p className="sl-field-error">{errors.intent.message}</p>
              ) : null}
            </fieldset>

            {intent ? (
              <fieldset className="sl-field">
                <legend className="sl-readout">Kurs *</legend>
                <div className="sl-chips">
                  {courseOptions.map((c) => {
                    const val = courseValue(c.label);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`sl-chip-btn sl-readout${course === val ? " is-active" : ""}`}
                        aria-pressed={course === val}
                        onClick={() => {
                          setValue("course", val, { shouldValidate: true });
                          setValue("membership", "");
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" {...register("course")} />
                {errors.course ? (
                  <p className="sl-field-error">{errors.course.message}</p>
                ) : null}
              </fieldset>
            ) : null}

            {memberships.length ? (
              <fieldset className="sl-field">
                <legend className="sl-readout">Mitgliedschaft *</legend>
                <div className="sl-chips">
                  {memberships.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`sl-chip-btn sl-readout${
                        watch("membership") === m.value ? " is-active" : ""
                      }`}
                      aria-pressed={watch("membership") === m.value}
                      onClick={() =>
                        setValue("membership", m.value, {
                          shouldValidate: true,
                        })
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" {...register("membership")} />
                {errors.membership ? (
                  <p className="sl-field-error">{errors.membership.message}</p>
                ) : null}
              </fieldset>
            ) : null}

            <div className="sl-field-row">
              <label className="sl-field">
                <span className="sl-readout">Name *</span>
                <input
                  className="sl-input"
                  {...register("name")}
                  autoComplete="name"
                />
                {errors.name ? (
                  <span className="sl-field-error">{errors.name.message}</span>
                ) : null}
              </label>
              <label className="sl-field">
                <span className="sl-readout">E-Mail *</span>
                <input
                  className="sl-input"
                  type="email"
                  {...register("email")}
                  autoComplete="email"
                />
                {errors.email ? (
                  <span className="sl-field-error">{errors.email.message}</span>
                ) : null}
              </label>
            </div>

            <div className="sl-field-row">
              <label className="sl-field">
                <span className="sl-readout">Telefon</span>
                <input
                  className="sl-input"
                  type="tel"
                  {...register("phone")}
                  autoComplete="tel"
                />
              </label>
              <label className="sl-field">
                <span className="sl-readout">Wunschtermin</span>
                <input className="sl-input" type="date" {...register("date")} />
              </label>
            </div>

            <label className="sl-field">
              <span className="sl-readout">Nachricht</span>
              <textarea
                className="sl-input"
                rows={3}
                {...register("message")}
              />
            </label>

            <div className="sl-form-actions">
              <button
                type="submit"
                className="sl-btn sl-btn-primary"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Wird gesendet …" : "Buchung absenden"}
                <span className="sl-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
              <button
                type="button"
                className="sl-btn sl-btn-glass"
                onClick={onClose}
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
