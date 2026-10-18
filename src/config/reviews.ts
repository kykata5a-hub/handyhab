// Real customer reviews only — copy them word for word from Google, Yelp, etc.
// The section on the home page is hidden while this list is empty.

export type ReviewSource = 'google' | 'yelp' | 'facebook' | 'nextdoor' | 'thumbtack' | 'direct';

export interface Review {
  /** As shown on the source, e.g. "Maria G." */
  name: string;
  /** Original text, unedited. Shown as-is on every language version. */
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  source: ReviewSource;
  /** 'YYYY-MM', optional. */
  date?: string;
  /** Neighborhood or service, optional, e.g. "Garage cleanout · Pasadena". */
  detail?: string;
  /** Link to the review itself, optional. */
  url?: string;
}

// Paste each review's text exactly as written; entries with an empty `text` are skipped.
const thumbtackUrl = 'https://www.thumbtack.com/ca/north-hollywood/handyman/handyhab/service/506290535920476172';

const googleUrl = 'https://share.google/LLUN4crwma2ACLet7';

// Texts are verbatim, as provided by the client from Google and Thumbtack.
const allReviews: Review[] = [
  {
    name: 'Rudy Serna',
    text: 'Steve from HandyHab Hauling provided excellent service! He responded quickly, arrived right on time, and efficiently hauled away a large treadmill and gas barbecue from our backyard. The entire process was smooth and hassle free . Very professional and reliable. I highly recommend Steve and HandyHab Hauling for anyone needing junk removal services.',
    rating: 5,
    source: 'google',
    date: '2026-10',
    detail: 'Backyard junk removal',
    url: googleUrl,
  },
  {
    name: 'Adam',
    text: 'Hands down the best junk removal service in the area! Aleksandr and his team arrived right on time, gave a fair quote on the spot, and loaded up everything in under an hour. Very polite and professional. Will definitely use HandyHab Hauling again!',
    rating: 5,
    source: 'google',
    date: '2026-10',
    url: googleUrl,
  },
  {
    name: 'Alicia S.',
    text: 'Alex came less than 2 hours after giving me a quote and loaded everything into the truck in under 15 minutes! I can’t recommend him enough. Great value, professional and such a great help!',
    rating: 5,
    source: 'thumbtack',
    date: '2026-09',
    detail: 'Junk removal',
    url: thumbtackUrl,
  },
];

export const reviews: Review[] = allReviews.filter((r) => r.text.trim());

/** Overall rating per platform, shown above the cards. Update the numbers from time to time. */
export interface ReviewSummary {
  source: ReviewSource;
  rating: number;
  count: number;
  url: string;
}
export const reviewSummaries: ReviewSummary[] = [
  // Google Business profile "Handyhab Hauling", as of 2026-10-18: 5.0 (6).
  { source: 'google', rating: 5.0, count: 6, url: googleUrl },
  // As of 2026-10-18: "Exceptional 5.0 (124)", Top Pro, hired 194 times.
  { source: 'thumbtack', rating: 5.0, count: 124, url: thumbtackUrl },
];

// Layout preview for `npm run dev` only; never rendered in a production build.
export const sampleReviews: Review[] = [
  {
    name: 'Sample Customer',
    text: 'SAMPLE — layout preview only. A real customer review will go here, word for word as it appears on Google or Yelp, two to four sentences long.',
    rating: 5,
    source: 'google',
    date: '2026-09',
    detail: 'Garage cleanout · Pasadena',
  },
  {
    name: 'Sample Customer',
    text: 'SAMPLE — layout preview only. Shorter review text.',
    rating: 5,
    source: 'yelp',
    date: '2026-08',
  },
  {
    name: 'Sample Customer',
    text: 'SAMPLE — layout preview only. A longer review to check how cards of different length line up next to each other on desktop and in the swipe row on phones, so nothing jumps around.',
    rating: 5,
    source: 'direct',
    detail: 'Estate cleanout · Glendale',
  },
];
