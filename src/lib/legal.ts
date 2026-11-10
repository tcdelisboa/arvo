/** Operator details shown on the legal pages. Set these before launch. */
export const LEGAL = {
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "[Legal name of the company operating Arvo]",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "[Registered address]",
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "[contact email]",
  updated: "11 November 2026",
};
