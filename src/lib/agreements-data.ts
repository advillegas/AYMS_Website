/**
 * Agreement model + document templates for the in-house e-signature
 * flow (a lightweight PandaDoc-style dupe).
 *
 * An Agreement is a legal document an admin sends to a prospect (an
 * existing member who reserved a trip). BOTH parties must sign: the
 * prospect reviews the document, acknowledges the required disclosures,
 * and types their name as a signature; the admin then counter-signs.
 * When both signatures are present the agreement is `completed`, which
 * is what converts a prospect into a confirmed client.
 *
 * IMPORTANT: the template bodies below are PLACEHOLDER copy. They are
 * structurally complete but legally generic and MUST be replaced with
 * attorney-approved language before they are used to bind anyone. Each
 * body carries a visible notice to that effect.
 *
 * Persistence lives in use-agreements.ts (Firestore) and
 * use-agreements-supabase.ts (Supabase). This module is pure data — no
 * I/O — so it can be imported by both backends and the UI.
 */

export type AgreementStatus =
  | "draft" // created, not yet sent
  | "sent" // delivered to the prospect, awaiting their signature
  | "prospect_signed" // prospect signed; awaiting admin counter-signature
  | "completed" // both parties signed — prospect is now a confirmed client
  | "void"; // cancelled by the admin

/** A single disclosure the prospect must explicitly acknowledge. */
export interface DisclosureAck {
  id: string;
  label: string;
  acknowledged: boolean;
}

export interface Agreement {
  id: string;

  /* linkage (all optional so an agreement can exist without a trip) */
  reservationId?: string; // tripReservations doc id
  tripId?: string;
  tripTitle: string; // denormalized for list display

  /* the prospect/member the document is addressed to */
  prospectId: string; // users/{uid}
  prospectName: string;
  prospectEmail?: string;

  /* content */
  templateId: string;
  title: string;
  bodyMarkdown: string; // merge fields already resolved
  disclosures: DisclosureAck[];

  /* signatures + lifecycle */
  status: AgreementStatus;
  adminSignerName?: string;
  adminSignatureText?: string;
  adminSignedAt?: string; // ISO
  prospectSignerName?: string;
  prospectSignatureText?: string;
  prospectSignedAt?: string; // ISO

  /* meta */
  createdBy?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Shape accepted by createAgreement (server fills id/timestamps/sigs). */
export type NewAgreement = {
  reservationId?: string;
  tripId?: string;
  tripTitle: string;
  prospectId: string;
  prospectName: string;
  prospectEmail?: string;
  templateId: string;
  title: string;
  bodyMarkdown: string;
  disclosures: DisclosureAck[];
};

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  draft: "Draft",
  sent: "Sent — awaiting traveler",
  prospect_signed: "Signed — awaiting countersign",
  completed: "Completed",
  void: "Void",
};

/** Both signatures present? */
export function isFullySigned(a: Agreement): boolean {
  return Boolean(a.adminSignedAt && a.prospectSignedAt);
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export interface AgreementTemplate {
  id: string;
  name: string;
  description: string;
  /** Default document title; supports merge fields. */
  titleTemplate: string;
  /** Body copy; supports merge fields. PLACEHOLDER — see notice. */
  body: string;
  /** Disclosures the prospect must tick before they can sign. */
  disclosures: { id: string; label: string }[];
}

/** Merge fields available to templates (documentation + admin UI hints). */
export const MERGE_FIELDS = [
  "companyName",
  "prospectName",
  "tripTitle",
  "destination",
  "dates",
  "price",
  "deposit",
  "today",
] as const;

export type MergeVars = Partial<Record<(typeof MERGE_FIELDS)[number], string>>;

const PLACEHOLDER_NOTICE =
  "[ PLACEHOLDER DOCUMENT — REPLACE WITH ATTORNEY-APPROVED LANGUAGE BEFORE USE. " +
  "This text is a structural draft only and is not legal advice. ]";

export const AGREEMENT_TEMPLATES: AgreementTemplate[] = [
  {
    id: "travel-services-agreement",
    name: "Travel Services Agreement",
    description:
      "Core booking agreement: trip, price, deposit, payment schedule, cancellation.",
    titleTemplate: "Travel Services Agreement — {{tripTitle}}",
    body: [
      PLACEHOLDER_NOTICE,
      "",
      "TRAVEL SERVICES AGREEMENT",
      "",
      "This Travel Services Agreement (the “Agreement”) is entered into between {{companyName}} (the “Organizer”) and {{prospectName}} (the “Traveler”) on {{today}}.",
      "",
      "1. THE TRIP",
      "The Organizer will provide the travel experience described as {{tripTitle}} to {{destination}}, scheduled for {{dates}}. The experience includes the items listed on the trip page in effect at the time of booking.",
      "",
      "2. PRICE & DEPOSIT",
      "The total price of the trip is {{price}}. A non-refundable deposit of {{deposit}} is due to reserve the Traveler’s place. The remaining balance is due per the payment schedule communicated by the Organizer. The Traveler’s place is not confirmed until the deposit is received and this Agreement is fully signed by both parties.",
      "",
      "3. PAYMENT",
      "Payments are arranged directly with the Organizer. The Organizer does not collect payment through this document. [PLACEHOLDER: insert accepted payment methods, due dates, and late-payment terms.]",
      "",
      "4. CANCELLATION & REFUNDS",
      "[PLACEHOLDER: insert the Organizer’s cancellation windows, refund percentages, and any non-refundable components. Describe what happens if the Organizer cancels or reschedules the trip.]",
      "",
      "5. TRAVELER RESPONSIBILITIES",
      "The Traveler is responsible for valid travel documents (passport/visa), required vaccinations, travel insurance, and arriving at all activities on time. [PLACEHOLDER: insert any additional traveler obligations.]",
      "",
      "6. CHANGES",
      "Itineraries may change for reasons outside the Organizer’s control (weather, supplier availability, safety). The Organizer will make reasonable efforts to provide comparable alternatives.",
      "",
      "7. ENTIRE AGREEMENT",
      "This Agreement, together with the trip page and any written payment schedule, is the entire agreement between the parties and supersedes prior discussions.",
      "",
      "By signing below, each party acknowledges they have read, understood, and agree to this Agreement.",
    ].join("\n"),
    disclosures: [
      {
        id: "deposit-nonrefundable",
        label: "I understand the deposit is non-refundable and reserves my place.",
      },
      {
        id: "balance-schedule",
        label: "I agree to pay the remaining balance on the schedule provided.",
      },
      {
        id: "read-agreement",
        label: "I have read and understood this Travel Services Agreement.",
      },
    ],
  },
  {
    id: "liability-waiver-disclosures",
    name: "Liability Waiver & Traveler Disclosures",
    description:
      "Assumption of risk, medical/insurance disclosures, media release, code of conduct.",
    titleTemplate: "Liability Waiver & Disclosures — {{tripTitle}}",
    body: [
      PLACEHOLDER_NOTICE,
      "",
      "LIABILITY WAIVER & TRAVELER DISCLOSURES",
      "",
      "Traveler: {{prospectName}}",
      "Trip: {{tripTitle}} — {{destination}} — {{dates}}",
      "Date: {{today}}",
      "",
      "1. ASSUMPTION OF RISK",
      "Travel involves inherent risks including, without limitation, transportation delays, illness, injury, loss of property, and activities that carry physical risk. The Traveler voluntarily assumes all such risks. [PLACEHOLDER: insert jurisdiction-appropriate assumption-of-risk language.]",
      "",
      "2. RELEASE OF LIABILITY",
      "To the fullest extent permitted by law, the Traveler releases {{companyName}}, its organizers, and partners from liability for losses arising out of the trip, except those caused by gross negligence or willful misconduct. [PLACEHOLDER: insert attorney-approved release/indemnification language.]",
      "",
      "3. MEDICAL & INSURANCE",
      "The Traveler confirms they are medically fit to participate and is responsible for obtaining adequate travel and medical insurance. The Traveler should disclose any condition that may require accommodation. [PLACEHOLDER: insert emergency-contact and insurance-requirement details.]",
      "",
      "4. MEDIA RELEASE",
      "Photos and video captured during the trip may be used by {{companyName}} for promotional purposes. The Traveler may opt out in writing before the trip.",
      "",
      "5. CODE OF CONDUCT",
      "The Traveler agrees to treat fellow travelers, hosts, and staff with respect and to follow local laws and Organizer guidance. The Organizer may remove a participant for conduct that endangers or harms others, without refund.",
      "",
      "By signing below, the Traveler confirms the disclosures above are true and agrees to this Waiver.",
    ].join("\n"),
    disclosures: [
      {
        id: "assume-risk",
        label: "I have read and accept the assumption of risk and release of liability.",
      },
      {
        id: "medically-fit",
        label: "I confirm I am medically fit to travel and will obtain travel insurance.",
      },
      {
        id: "media-release",
        label: "I understand the media release and how to opt out.",
      },
      {
        id: "code-of-conduct",
        label: "I agree to the code of conduct.",
      },
    ],
  },
];

export function getTemplate(id: string): AgreementTemplate | undefined {
  return AGREEMENT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Replace {{mergeField}} tokens with provided values. Unknown or missing
 * fields are left visible (e.g. "{{deposit}}") so the admin notices a gap
 * before sending rather than shipping a silently-blank contract.
 */
export function renderTemplate(text: string, vars: MergeVars): string {
  return text.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, key: string) => {
    const v = (vars as Record<string, string | undefined>)[key];
    return v != null && v !== "" ? v : match;
  });
}

/** Disclosures for a template as fresh (un-acknowledged) ack objects. */
export function templateDisclosures(t: AgreementTemplate): DisclosureAck[] {
  return t.disclosures.map((d) => ({ ...d, acknowledged: false }));
}
