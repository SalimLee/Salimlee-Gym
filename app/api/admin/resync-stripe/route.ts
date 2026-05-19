import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { syncStripeInvoices } from "@/lib/stripe-invoice-sync";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Nachträglicher Re-Sync:
 * 1. Zieht alle aktuellen Stripe-Invoices in die invoices Tabelle (inkl. 10er-Karten mit invoice_creation)
 * 2. Gleicht den Status aller pending Subscriptions mit Stripe ab
 *
 * Wird vom Admin manuell getriggert, wenn Webhook-Events verpasst wurden.
 */
export async function POST() {
  try {
    // 1. Invoices syncen (90 Tage zurück)
    const invoiceResult = await syncStripeInvoices(90);

    // 2. Alle Abos laden — wir prüfen sowohl verknüpfte als auch unverknüpfte
    //    (manche wurden mit Anon-Key erstellt, wo RLS die Stripe-ID-Writes silently verwarf)
    const { data: subs } = await supabaseAdmin.from("subscriptions").select(`
        id, status, payment_status, name, member_id,
        stripe_subscription_id, stripe_checkout_session_id, stripe_customer_id,
        members:member_id ( email, name )
      `);

    const subResult = {
      checked: 0,
      updated: 0,
      revertedToPending: 0,
      ghostSubsCleared: 0,
      errors: [] as string[],
    };

    for (const sub of (subs || []) as Array<
      Record<string, unknown> & {
        members?:
          | { email?: string; name?: string }
          | { email?: string; name?: string }[];
      }
    >) {
      subResult.checked++;
      try {
        const updateData: Record<string, string | null> = {};
        // Supabase kann members als Array zurückgeben — beides abdecken
        const member = Array.isArray(sub.members)
          ? sub.members[0]
          : sub.members;
        const memberEmail = member?.email;

        const stripeSubscriptionId = sub.stripe_subscription_id as
          | string
          | null;
        const stripeCheckoutSessionId = sub.stripe_checkout_session_id as
          | string
          | null;
        const stripeCustomerId = sub.stripe_customer_id as string | null;

        // A) Falls Stripe-Subscription existiert → echten Status holen
        if (stripeSubscriptionId) {
          let stripeSub: Awaited<
            ReturnType<typeof stripe.subscriptions.retrieve>
          > | null = null;
          let stripeSubMissing = false;
          try {
            stripeSub =
              await stripe.subscriptions.retrieve(stripeSubscriptionId);
          } catch (e: unknown) {
            // Stripe wirft 'resource_missing' wenn die Sub-ID auf Stripe-Seite nicht existiert
            // (z.B. fälschlich in DB geschrieben, Test-Daten, Sub in Stripe gelöscht).
            const errObj = e as { code?: string; statusCode?: number };
            if (
              errObj.code === "resource_missing" ||
              errObj.statusCode === 404
            ) {
              stripeSubMissing = true;
            } else {
              throw e;
            }
          }

          if (stripeSubMissing) {
            // "Geister-Sub": ID in DB, aber Stripe kennt sie nicht. Lokal aufräumen,
            // damit der Coach den Kunden über "Erinnern" einen neuen Checkout-Link bekommt.
            updateData.stripe_subscription_id = null;
            if (sub.status === "active" || sub.status === "paused") {
              updateData.status = "pending";
              updateData.payment_status = "pending";
            } else if (
              sub.payment_status === "paid" ||
              sub.payment_status === "processing"
            ) {
              updateData.payment_status = "pending";
            }
            subResult.ghostSubsCleared++;
          } else if (stripeSub) {
            if (
              stripeSub.status === "active" ||
              stripeSub.status === "trialing"
            ) {
              if (sub.status !== "active") updateData.status = "active";
              if (sub.payment_status !== "paid")
                updateData.payment_status = "paid";
            } else if (stripeSub.status === "canceled") {
              if (sub.status === "active" || sub.status === "paused") {
                updateData.status = "cancelled";
              }
              // pending oder schon cancelled → nicht überschreiben
            } else if (
              stripeSub.status === "past_due" ||
              stripeSub.status === "unpaid"
            ) {
              updateData.payment_status = "failed";
            } else if (
              stripeSub.status === "incomplete" ||
              stripeSub.status === "incomplete_expired"
            ) {
              // Initialzahlung wurde nie erfolgreich → lokal als pending halten
              if (sub.status !== "pending") updateData.status = "pending";
              updateData.payment_status = "failed";
            }
          }
        }
        // B) Nur Checkout-Session → Session-Status prüfen
        else if (stripeCheckoutSessionId) {
          const session = await stripe.checkout.sessions.retrieve(
            stripeCheckoutSessionId,
          );

          // PaymentIntent-Status prüfen (auch für SEPA async)
          let piStatus: string | null = null;
          if (session.payment_intent) {
            const piId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent.id;
            const pi = await stripe.paymentIntents.retrieve(piId);
            piStatus = pi.status;
          }

          if (session.payment_status === "paid" || piStatus === "succeeded") {
            if (sub.status !== "active") updateData.status = "active";
            if (sub.payment_status !== "paid")
              updateData.payment_status = "paid";
          }
          // STRENGE Erkennung "echte SEPA in Bearbeitung":
          //   Nur wenn der Kunde wirklich auf "Bezahlen" geklickt hat (Session 'complete')
          //   UND eine PaymentIntent existiert die 'processing' oder 'requires_action' ist.
          else if (
            session.status === "complete" &&
            (piStatus === "processing" || piStatus === "requires_action")
          ) {
            if (sub.payment_status !== "processing")
              updateData.payment_status = "processing";
          }
          // Session ist 'open' (Link nie geöffnet) / 'expired' / 'complete' ohne Payment-Versuch
          // → zurück auf 'pending', damit Coach erinnern kann. Greift den Lambinot-Kastrati-Fall ab.
          else if (
            session.status === "open" ||
            session.status === "expired" ||
            (session.status === "complete" && !piStatus) ||
            piStatus === "canceled" ||
            piStatus === "requires_payment_method"
          ) {
            if (
              sub.status === "pending" &&
              sub.payment_status === "processing"
            ) {
              updateData.payment_status = "pending";
              subResult.revertedToPending++;
            }
          }

          // Falls durch Session eine Subscription entstanden ist, speichern
          if (session.subscription) {
            const subId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id;
            updateData.stripe_subscription_id = subId;
          }
        }
        // C) Kein Stripe-Link in DB → via Customer-Email in Stripe suchen
        //    (nötig für Abos, wo RLS die ID-Writes verwarf)
        else if (memberEmail) {
          const customers = await stripe.customers.list({
            email: memberEmail,
            limit: 5,
          });
          let matched = false;
          for (const customer of customers.data) {
            const sessions = await stripe.checkout.sessions.list({
              customer: customer.id,
              limit: 20,
            });
            const paidSession = sessions.data.find(
              (s) => s.payment_status === "paid",
            );
            // STRENG: nur Sessions die der Kunde wirklich abgeschlossen hat (status=complete)
            // UND einen PaymentIntent haben, der nicht canceled/abandoned ist.
            const realProcessingSession = sessions.data.find(
              (s) =>
                s.status === "complete" &&
                s.payment_status === "unpaid" &&
                s.payment_intent,
            );

            if (paidSession) {
              updateData.stripe_customer_id = customer.id;
              updateData.stripe_checkout_session_id = paidSession.id;
              updateData.status = "active";
              updateData.payment_status = "paid";
              if (paidSession.subscription) {
                const subId =
                  typeof paidSession.subscription === "string"
                    ? paidSession.subscription
                    : paidSession.subscription.id;
                updateData.stripe_subscription_id = subId;
              }
              matched = true;
              break;
            } else if (realProcessingSession) {
              // Genau prüfen: PaymentIntent muss processing/requires_action sein
              const piId =
                typeof realProcessingSession.payment_intent === "string"
                  ? realProcessingSession.payment_intent
                  : realProcessingSession.payment_intent?.id;
              if (piId) {
                const pi = await stripe.paymentIntents.retrieve(piId);
                if (
                  pi.status === "processing" ||
                  pi.status === "requires_action"
                ) {
                  updateData.stripe_customer_id = customer.id;
                  updateData.stripe_checkout_session_id =
                    realProcessingSession.id;
                  updateData.payment_status = "processing";
                  matched = true;
                  break;
                }
              }
            }
          }

          // Wenn lokal 'processing' steht, wir aber kein echter Versuch finden:
          // → das ist der Lambinot-Kastrati-Fall. Auf 'pending' zurücksetzen, damit
          //   der Coach im Dashboard auf "Erinnern" klicken kann.
          if (
            !matched &&
            sub.status === "pending" &&
            sub.payment_status === "processing"
          ) {
            updateData.payment_status = "pending";
            subResult.revertedToPending++;
          }
        }

        // D) FINALER Safety-Net (greift IMMER nach allen anderen Pfaden):
        //    Wenn die Sub lokal als "SEPA in Bearbeitung" (pending + processing)
        //    angezeigt wird, aber irgendwo bei Stripe kein einziger laufender
        //    PaymentIntent existiert, dann ist das ein Geister-Status. Reset auf 'pending'.
        //
        //    Wir machen das robust: erst direkt am bekannten Customer, dann per Email
        //    über mehrere Customer-Profile (Stripe erlaubt Duplikate). Erst wenn alle
        //    Wege "nichts gefunden" sagen, geben wir den Status frei.
        const endStatus =
          (updateData.status as string | undefined) ?? (sub.status as string);
        const endPaymentStatus =
          (updateData.payment_status as string | undefined) ??
          (sub.payment_status as string);
        if (endStatus === "pending" && endPaymentStatus === "processing") {
          try {
            const customerIds: string[] = [];
            if (stripeCustomerId) customerIds.push(stripeCustomerId);
            if (memberEmail) {
              const customers = await stripe.customers.list({
                email: memberEmail,
                limit: 5,
              });
              for (const c of customers.data) {
                if (!customerIds.includes(c.id)) customerIds.push(c.id);
              }
            }

            let hasRealAttempt = false;
            for (const cid of customerIds) {
              const pis = await stripe.paymentIntents.list({
                customer: cid,
                limit: 20,
              });
              if (
                pis.data.some(
                  (p) =>
                    p.status === "processing" ||
                    p.status === "succeeded" ||
                    p.status === "requires_action",
                )
              ) {
                hasRealAttempt = true;
                break;
              }
            }

            if (!hasRealAttempt) {
              updateData.payment_status = "pending";
              subResult.revertedToPending++;
            }
          } catch (e) {
            console.warn(
              `Sub ${sub.id}: SEPA-Realitäts-Check fehlgeschlagen:`,
              e,
            );
          }
        }

        // E) STRENGE Prüfung auch für neue Kunden mit Anteilig-Abrechnung:
        //    Lokal sieht das Abo aktiv & bezahlt aus, ABER es gibt keine Stripe-Sub-ID.
        //    Das darf normalerweise nicht vorkommen — wenn der Stripe-Checkout-Flow
        //    durchlief, sollte die ID gespeichert sein. Wir prüfen über den
        //    Stripe-Customer ob es wirklich eine aktive Subscription gibt.
        if (
          !stripeSubscriptionId &&
          !updateData.stripe_subscription_id &&
          sub.status === "active" &&
          sub.payment_status === "paid" &&
          (stripeCustomerId || stripeCheckoutSessionId || memberEmail)
        ) {
          try {
            let foundActive = false;
            // 1) Bevorzugt: direkt am Customer suchen
            if (stripeCustomerId) {
              const customerSubs = await stripe.subscriptions.list({
                customer: stripeCustomerId,
                status: "all",
                limit: 10,
              });
              const active = customerSubs.data.find(
                (s) =>
                  s.status === "active" ||
                  s.status === "trialing" ||
                  s.status === "past_due",
              );
              if (active) {
                updateData.stripe_subscription_id = active.id;
                foundActive = true;
              }
            }
            // 2) Fallback: per Email den Customer suchen
            if (!foundActive && memberEmail) {
              const customers = await stripe.customers.list({
                email: memberEmail,
                limit: 5,
              });
              for (const c of customers.data) {
                const customerSubs = await stripe.subscriptions.list({
                  customer: c.id,
                  status: "all",
                  limit: 10,
                });
                const active = customerSubs.data.find(
                  (s) =>
                    s.status === "active" ||
                    s.status === "trialing" ||
                    s.status === "past_due",
                );
                if (active) {
                  updateData.stripe_customer_id = c.id;
                  updateData.stripe_subscription_id = active.id;
                  foundActive = true;
                  break;
                }
              }
            }
            // Wirklich nichts gefunden → DB lügt. Auf pending zurück, damit der Coach
            // einen neuen Checkout-Link rausschicken kann.
            if (!foundActive) {
              updateData.status = "pending";
              updateData.payment_status = "pending";
              subResult.ghostSubsCleared++;
            }
          } catch (e) {
            console.warn(
              `Sub ${sub.id}: Stripe-Lookup für Phantom-Active fehlgeschlagen:`,
              e,
            );
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabaseAdmin
            .from("subscriptions")
            .update(updateData)
            .eq("id", sub.id);
          if (error) {
            subResult.errors.push(`${sub.id}: ${error.message}`);
          } else {
            subResult.updated++;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        subResult.errors.push(`${sub.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      invoices: invoiceResult,
      subscriptions: subResult,
    });
  } catch (error) {
    console.error("Stripe Re-Sync fehlgeschlagen:", error);
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Re-Sync fehlgeschlagen: ${message}` },
      { status: 500 },
    );
  }
}
