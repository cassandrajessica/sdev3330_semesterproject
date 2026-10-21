// The five categories from the mockup, mapped to Ticketmaster search params.
// Ticketmaster's top-level "segments" are Music, Sports, Arts & Theatre, Film
// and Miscellaneous. It has no food segment, so Food & Culture uses a keyword.
export const CATEGORIES = [
  {
    id: 'music',
    label: 'Music & Nightlife',
    params: { classificationName: 'Music' },
    color: 'var(--powder-blush)',
    blurb: 'Concerts, club nights and live sets happening around you.',
  },
  {
    id: 'arts',
    label: 'Arts & Culture',
    params: { classificationName: 'Arts & Theatre' },
    color: 'var(--alabaster-grey)',
    blurb: 'Theatre, comedy, dance and exhibitions worth getting out for.',
  },
  {
    id: 'food',
    label: 'Food & Culture',
    params: { keyword: 'food' },
    color: 'var(--peach-glow)',
    blurb: 'Food festivals, tastings and events built around a good meal.',
  },
  {
    id: 'community',
    label: 'Community',
    params: { classificationName: 'Miscellaneous' },
    color: 'var(--linen)',
    blurb: 'Fairs, expos, family days and other local gatherings.',
  },
  {
    id: 'sports',
    label: 'Active & Sports',
    params: { classificationName: 'Sports' },
    color: 'var(--peach-fuzz)',
    blurb: 'Games, races and ways to get moving.',
  },
];

export function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}
