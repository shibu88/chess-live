// Curated country filter for the "Top tournaments" dropdown.
//
// The Lichess broadcast API has no country/federation field on a tournament —
// only `tour.tier` and dates. So a tournament's country can only be *guessed*
// from its free-text `name` + `info.location`. This is best-effort by design:
// it will miss or misclassify some events. `fed` is a FIDE code used only to
// render the flag (via src/ui/flag.js) and label the menu row.
//
// Each entry's `patterns` match the country name, the demonym, and a few major
// host cities. We deliberately avoid ambiguous words like "Swiss" (a pairing
// format) and "American" (as in Pan-American) to cut down on false matches.

export const COUNTRIES = [
  {
    fed: 'IND',
    name: 'India',
    patterns: [
      /\bindia(n)?\b/i, /\bchennai\b/i, /\bnew delhi\b/i, /\bdelhi\b/i,
      /\bmumbai\b/i, /\bkolkata\b/i, /\b(bengaluru|bangalore)\b/i,
      /\bhyderabad\b/i, /\bpune\b/i, /\bchandigarh\b/i, /\bahmedabad\b/i, /\bgoa\b/i,
    ],
  },
  { fed: 'ARG', name: 'Argentina', patterns: [/\bargentin(a|e|ian)\b/i, /\bbuenos aires\b/i] },
  { fed: 'ARM', name: 'Armenia', patterns: [/\barmenia(n)?\b/i, /\byerevan\b/i] },
  { fed: 'AUS', name: 'Australia', patterns: [/\baustralia(n)?\b/i, /\bsydney\b/i, /\bmelbourne\b/i] },
  { fed: 'AUT', name: 'Austria', patterns: [/\baustria(n)?\b/i, /\bvienna\b/i] },
  { fed: 'AZE', name: 'Azerbaijan', patterns: [/\bazerbaijan(i)?\b/i, /\bbaku\b/i] },
  { fed: 'BRA', name: 'Brazil', patterns: [/\bbrazil(ian)?\b/i, /\bbrasil\b/i, /\bsao paulo\b/i] },
  { fed: 'CAN', name: 'Canada', patterns: [/\bcanad(a|ian)\b/i, /\btoronto\b/i, /\bmontreal\b/i] },
  { fed: 'CHN', name: 'China', patterns: [/\bchin(a|ese)\b/i, /\bshanghai\b/i, /\bbeijing\b/i, /\bshenzhen\b/i, /\bhangzhou\b/i] },
  { fed: 'CRO', name: 'Croatia', patterns: [/\bcroatia(n)?\b/i, /\bzagreb\b/i] },
  { fed: 'CUB', name: 'Cuba', patterns: [/\bcuba(n)?\b/i, /\bhavana\b/i] },
  { fed: 'CZE', name: 'Czech Republic', patterns: [/\bczech\b/i, /\b(prague|praha)\b/i] },
  { fed: 'DEN', name: 'Denmark', patterns: [/\bdenmark\b/i, /\bdanish\b/i, /\bcopenhagen\b/i] },
  { fed: 'EGY', name: 'Egypt', patterns: [/\begypt(ian)?\b/i, /\bcairo\b/i] },
  { fed: 'ENG', name: 'England', patterns: [/\bengland\b/i, /\benglish\b/i, /\blondon\b/i] },
  { fed: 'FRA', name: 'France', patterns: [/\bfrance\b/i, /\bfrench\b/i, /\bparis\b/i] },
  { fed: 'GEO', name: 'Georgia', patterns: [/\bgeorgia(n)?\b/i, /\btbilisi\b/i, /\bbatumi\b/i] },
  { fed: 'GER', name: 'Germany', patterns: [/\bgermany\b/i, /\bgerman\b/i, /\bberlin\b/i] },
  { fed: 'GRE', name: 'Greece', patterns: [/\bgree(ce|k)\b/i, /\bathens\b/i] },
  { fed: 'HUN', name: 'Hungary', patterns: [/\bhungar(y|ian)\b/i, /\bbudapest\b/i] },
  { fed: 'INA', name: 'Indonesia', patterns: [/\bindonesia(n)?\b/i, /\bjakarta\b/i] },
  { fed: 'IRI', name: 'Iran', patterns: [/\biran(ian)?\b/i, /\btehran\b/i] },
  { fed: 'ISL', name: 'Iceland', patterns: [/\biceland(ic)?\b/i, /\breykjavik\b/i] },
  { fed: 'ISR', name: 'Israel', patterns: [/\bisrael(i)?\b/i, /\btel aviv\b/i] },
  { fed: 'ITA', name: 'Italy', patterns: [/\bital(y|ian)\b/i, /\brome\b/i, /\bmilan\b/i] },
  { fed: 'KAZ', name: 'Kazakhstan', patterns: [/\bkazakh(stan)?\b/i, /\balmaty\b/i, /\bastana\b/i] },
  { fed: 'MEX', name: 'Mexico', patterns: [/\bmexic(o|an)\b/i] },
  { fed: 'NED', name: 'Netherlands', patterns: [/\bnetherlands\b/i, /\bdutch\b/i, /\bamsterdam\b/i, /\bwijk aan zee\b/i] },
  { fed: 'NOR', name: 'Norway', patterns: [/\bnorway\b/i, /\bnorwegian\b/i, /\boslo\b/i, /\bstavanger\b/i] },
  { fed: 'PER', name: 'Peru', patterns: [/\bperu(vian)?\b/i, /\blima\b/i] },
  { fed: 'PHI', name: 'Philippines', patterns: [/\bphilippine(s)?\b/i, /\bmanila\b/i] },
  { fed: 'POL', name: 'Poland', patterns: [/\bpol(and|ish)\b/i, /\bwarsaw\b/i, /\bkatowice\b/i] },
  { fed: 'ROU', name: 'Romania', patterns: [/\bromania(n)?\b/i, /\bbucharest\b/i] },
  { fed: 'RUS', name: 'Russia', patterns: [/\brussia(n)?\b/i, /\bmoscow\b/i] },
  { fed: 'RSA', name: 'South Africa', patterns: [/\bsouth africa(n)?\b/i, /\bjohannesburg\b/i] },
  { fed: 'SRB', name: 'Serbia', patterns: [/\bserbia(n)?\b/i, /\bbelgrade\b/i] },
  { fed: 'ESP', name: 'Spain', patterns: [/\bspain\b/i, /\bspanish\b/i, /\bmadrid\b/i, /\bbarcelona\b/i] },
  { fed: 'SWE', name: 'Sweden', patterns: [/\bswed(en|ish)\b/i, /\bstockholm\b/i] },
  { fed: 'SUI', name: 'Switzerland', patterns: [/\bswitzerland\b/i, /\bgeneva\b/i, /\bzurich\b/i, /\bbiel\b/i] },
  { fed: 'TUR', name: 'Türkiye', patterns: [/\bturk(ey|iye|ish)\b/i, /\bistanbul\b/i, /\bantalya\b/i] },
  { fed: 'UKR', name: 'Ukraine', patterns: [/\bukrain(e|ian)\b/i, /\b(kyiv|kiev)\b/i] },
  { fed: 'USA', name: 'United States', patterns: [/\b(usa|u\.?s\.?a\.?|united states)\b/i, /\bst\.? ?louis\b/i, /\bsaint louis\b/i, /\bnew york\b/i] },
  { fed: 'UZB', name: 'Uzbekistan', patterns: [/\buzbek(istan)?\b/i, /\btashkent\b/i, /\bsamarkand\b/i] },
  { fed: 'VIE', name: 'Vietnam', patterns: [/\bvietnam(ese)?\b/i, /\bhanoi\b/i] },
];

/** Look up a curated entry by its FIDE code. */
export function countryByFed(fed) {
  return COUNTRIES.find((c) => c.fed === fed) || null;
}

/**
 * Best-effort test: does this tournament look like it belongs to `fed`'s
 * country? Matches the entry's patterns against the tour name + location text.
 */
export function matchCountry(fed, tour) {
  const entry = countryByFed(fed);
  if (!entry || !tour) return false;
  const text = `${tour.name || ''} ${tour.info?.location || ''}`;
  return entry.patterns.some((re) => re.test(text));
}
