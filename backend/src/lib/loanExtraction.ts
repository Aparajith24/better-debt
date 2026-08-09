import { PDFParse } from "pdf-parse";
import { z } from "zod";

// Nullable, not required-with-defaults: a field the regexes can't find stays
// null rather than getting guessed. Confirmation happens against
// loanOfferTermsSchema once the user has reviewed these fields — this is a
// first draft, not a verdict.
const extractedTermsSchema = z.object({
  lenderName: z.string().nullable(),
  loanType: z.enum(["CREDIT_CARD", "PERSONAL_LOAN", "EMI", "BNPL", "OTHER"]).nullable(),
  principal: z.number().nullable(),
  tenureMonths: z.number().nullable(),
  rateType: z.enum(["FLAT", "REDUCING"]).nullable(),
  quotedRateAnnual: z.number().nullable(),
  processingFeeValue: z.number().nullable(),
  otherUpfrontFees: z.number().nullable(),
  prepaymentPenaltyPercent: z.number().nullable(),
  teaserRateAnnual: z.number().nullable(),
  teaserMonths: z.number().nullable(),
  postTeaserRateAnnual: z.number().nullable(),
  notes: z.array(z.string()),
});

export type ExtractedLoanTerms = z.infer<typeof extractedTermsSchema>;

export interface LoanExtractionResult {
  extracted: ExtractedLoanTerms;
  documentTextLength: number;
}

const AMOUNT = String.raw`(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d+)?)`;
const PERCENT = String.raw`(\d+(?:\.\d+)?)\s?%`;

function firstMatch(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? match[1] : null;
}

function parseAmount(text: string, keywordPattern: string): number | null {
  const raw = firstMatch(text, new RegExp(`${keywordPattern}[^\\d₹]{0,20}${AMOUNT}`, "i"));
  return raw ? Number(raw.replace(/,/g, "")) : null;
}

// Checks both orderings ("X% thereafter" and "thereafter is X%") since real
// offer letters use either — a percent immediately before the keyword is
// checked first since that's the more common phrasing.
function parsePercentNear(text: string, keywordPattern: string): number | null {
  const before = firstMatch(text, new RegExp(`${PERCENT}[^\\d%]{0,40}${keywordPattern}`, "i"));
  if (before) return Number(before);
  const after = firstMatch(text, new RegExp(`${keywordPattern}[^\\d%]{0,40}${PERCENT}`, "i"));
  return after ? Number(after) : null;
}

function parsePercent(text: string, keywordPattern: string): number | null {
  const raw = firstMatch(text, new RegExp(`${keywordPattern}[^\\d%]{0,20}${PERCENT}`, "i"));
  return raw ? Number(raw) : null;
}

// Pattern-matches common phrasing in Indian consumer-loan / EMI / BNPL offer
// letters. Free and offline, at the cost of missing anything phrased
// unusually — the confirmation form is where the user catches that, not
// this function.
function extractTermsFromText(text: string): ExtractedLoanTerms {
  const notes: string[] = [];
  const lower = text.toLowerCase();

  const principal = parseAmount(text, "(?:loan amount|principal|sanctioned amount|amount)");
  if (principal === null) notes.push("Couldn't find the loan/principal amount — please fill it in.");

  const tenureRaw = firstMatch(text, /tenure[^\d]{0,20}(\d+)\s*months?/i) ?? firstMatch(text, /(\d+)\s*months?\s*tenure/i);
  const tenureMonths = tenureRaw ? Number(tenureRaw) : null;
  if (tenureMonths === null) notes.push("Couldn't find the tenure in months — please fill it in.");

  const isNoCost = /no[-\s]?cost emi|0\s?%\s*(?:emi|interest|p\.?a\.?)/i.test(text);
  const isFlat = /flat\s+rate/i.test(text);
  let rateType: "FLAT" | "REDUCING" | null = null;
  let quotedRateAnnual: number | null = null;

  if (isNoCost) {
    rateType = "REDUCING";
    quotedRateAnnual = 0;
  } else if (isFlat) {
    rateType = "FLAT";
    quotedRateAnnual = parsePercent(text, "flat\\s+rate(?:\\s+of)?");
  } else {
    const pa = firstMatch(text, new RegExp(`${PERCENT}\\s*(?:p\\.?a\\.?|per annum)`, "i"));
    if (pa) {
      rateType = "REDUCING";
      quotedRateAnnual = Number(pa);
    }
  }
  if (rateType === null || quotedRateAnnual === null) {
    notes.push("Couldn't determine the interest rate or whether it's flat/reducing — please fill it in.");
  }

  const processingFeeValue = parseAmount(text, "processing\\s+fee");
  if (processingFeeValue === null && !/no processing fee|processing fee.{0,10}(?:nil|waived|free)/i.test(lower)) {
    notes.push("Couldn't find a processing fee amount — check the document for one and fill it in if present.");
  }

  const otherFeeMatches = [...text.matchAll(new RegExp(`(?:documentation|convenience|handling|admin(?:istration)?)\\s+fee[^\\d₹]{0,20}${AMOUNT}`, "gi"))];
  const otherUpfrontFees = otherFeeMatches.length > 0
    ? otherFeeMatches.reduce((sum, m) => sum + Number(m[1].replace(/,/g, "")), 0)
    : 0;

  const prepaymentPenaltyPercent = parsePercent(text, "(?:prepayment|foreclosure)\\s+(?:penalty|charges?)");

  const teaserMonthsRaw = firstMatch(text, /first\s+(\d+)\s*months?/i);
  const teaserMonths = teaserMonthsRaw ? Number(teaserMonthsRaw) : null;
  const teaserRateAnnual = teaserMonths ? parsePercentNear(text, "first\\s+\\d+\\s*months?") : null;
  const postTeaserRateAnnual = teaserMonths ? parsePercentNear(text, "thereafter") : null;

  let loanType: ExtractedLoanTerms["loanType"] = null;
  if (/credit card/i.test(lower)) loanType = "CREDIT_CARD";
  else if (/bnpl|buy now pay later/i.test(lower)) loanType = "BNPL";
  else if (/emi/i.test(lower)) loanType = "EMI";
  else if (/personal loan/i.test(lower)) loanType = "PERSONAL_LOAN";

  const lenderName = firstMatch(text, /^([A-Z][A-Za-z&.\s]{2,60}(?:Pvt\.?\s?Ltd\.?|Limited|Finance|Bank|NBFC))/m);
  if (!lenderName) notes.push("Couldn't identify the lender name — please fill it in.");

  return extractedTermsSchema.parse({
    lenderName,
    loanType,
    principal,
    tenureMonths,
    rateType,
    quotedRateAnnual,
    processingFeeValue,
    otherUpfrontFees,
    prepaymentPenaltyPercent,
    teaserRateAnnual,
    teaserMonths,
    postTeaserRateAnnual,
    notes,
  });
}

export async function extractLoanTermsFromPdf(pdfBuffer: Buffer): Promise<LoanExtractionResult> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const parsed = await parser.getText();
  await parser.destroy();
  const documentText = parsed.text.trim();

  if (documentText.length === 0) {
    throw new Error("Could not read any text from this PDF — it may be a scanned image rather than a text document.");
  }

  return { extracted: extractTermsFromText(documentText), documentTextLength: documentText.length };
}
