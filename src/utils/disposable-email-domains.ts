// A curated subset of known disposable and temporary email providers.
// The list intentionally focuses on the most common services to avoid
// false positives while still catching the vast majority of throwaway
// addresses encountered in the wild.
const DISPOSABLE_EMAIL_DOMAINS = [
  "0-mail.com",
  "10mail.org",
  "10mail.tk",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minutesemail.net",
  "20minutemail.com",
  "33mail.com",
  "armyspy.com",
  "byom.de",
  "cuvox.de",
  "discard.email",
  "discardmail.com",
  "dispostable.com",
  "dodgit.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemailgenerator.com",
  "fakemail.net",
  "getairmail.com",
  "getairmail.net",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "gustr.com",
  "harakirimail.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailinator.us",
  "mailinator.xyz",
  "mailnesia.com",
  "mailpoof.com",
  "mailtemp.net",
  "mailtemporaire.fr",
  "mailtwt.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "my10minutemail.com",
  "mytrashmail.com",
  "nowmymail.com",
  "poofy.org",
  "sharklasers.com",
  "spam4.me",
  "spamavert.com",
  "spamgourmet.com",
  "spaml.de",
  "tempmail.com",
  "tempmail.de",
  "tempmail.net",
  "tempmail.org",
  "tempmailo.com",
  "tempmailo.net",
  "tempmailo.org",
  "temp-mail.cc",
  "temp-mail.io",
  "temp-mail.org",
  "temporarymail.com",
  "tempinbox.com",
  "trash-mail.com",
  "trash-mail.de",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "trashmails.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net"
] as const;

const DISPOSABLE_DOMAIN_SET = new Set<string>(DISPOSABLE_EMAIL_DOMAINS);

// Additional provider keywords catch vanity domains such as
// "{user}.tempmail.xyz" that would otherwise require enumerating
// thousands of permutations.
const DISPOSABLE_KEYWORDS = [
  "tempmail",
  "temp-mail",
  "10minutemail",
  "10minuteemail",
  "minuteinbox",
  "throwawaymail",
  "discardmail",
  "trashmail",
  "guerrillamail",
  "guerillamail",
  "mailinator",
  "maildrop",
  "mailcatch",
  "spamgourmet",
  "spammail",
  "mailpoof",
  "burnermail",
  "mailnull",
  "moakt",
  "mohmal",
  "spam4",
  "dropmail",
  "getnada",
  "mintemail",
  "fakeinbox",
  "fakemail"
];

const normalizeDomain = (domain: string): string =>
  domain.trim().toLowerCase().replace(/\.$/, "");

const getSuffixes = (domain: string): string[] => {
  const parts = domain.split(".");
  const suffixes: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const suffix = parts.slice(i).join(".");
    suffixes.push(suffix);
  }

  return suffixes;
};

/**
 * Checks if a domain (or any of its parent domains) is a known disposable provider.
 */
export const matchesDisposableDomainList = (domain: string): boolean => {
  const normalized = normalizeDomain(domain);
  return getSuffixes(normalized).some((suffix) =>
    DISPOSABLE_DOMAIN_SET.has(suffix)
  );
};

/**
 * Heuristic keyword detection to catch vanity subdomains and new disposable providers.
 * This is intentionally conservative to avoid false positives.
 */
export const matchesDisposableKeyword = (domain: string): boolean => {
  const normalized = normalizeDomain(domain);
  return DISPOSABLE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
};

export const isDisposableEmailDomain = (domain: string): boolean =>
  matchesDisposableDomainList(domain) || matchesDisposableKeyword(domain);

