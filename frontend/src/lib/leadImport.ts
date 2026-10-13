/**
 * Spreadsheet header -> lead field mapping for the Excel/CSV import.
 *
 * Headers in the wild vary a lot ("Best Time to Call", "call_time",
 * "Cold Call Questions", "Probelm"), so each header is scored against every
 * field and the best header wins each field. Columns that match nothing are
 * ignored, and fields with no matching column are simply left empty.
 */

export type ImportField =
  | 'businessName'
  | 'personName'
  | 'contact'
  | 'email'
  | 'website'
  | 'location'
  | 'notes'
  | 'status'
  | 'bestCallTime'
  | 'problem'
  | 'solution'
  | 'coldCallQuestions'
  // Not stored on the lead; only used to infer bestCallTime.
  | 'businessHours';

interface FieldRule {
  field: ImportField;
  /** Exact header names (normalized), most specific first. */
  aliases: string[];
  /** Word stems that identify the field when the header isn't an exact alias. */
  keywords?: string[][];
  /** Header words that rule this field out (e.g. "Cold Called" is not a call time). */
  exclude?: string[];
}

// Order matters for ties: specific call-prep fields are checked before the
// generic contact/name fields so "Questions to ask the contact" lands on
// coldCallQuestions rather than personName.
const RULES: FieldRule[] = [
  {
    field: 'coldCallQuestions',
    aliases: ['coldcallquestions', 'questionstoask', 'callquestions', 'questions', 'question', 'discoveryquestions', 'qualifyingquestions'],
    keywords: [['question'], ['ask']],
  },
  {
    field: 'problem',
    aliases: ['problem', 'problems', 'whatstheproblem', 'theproblem', 'currentproblem', 'painpoint', 'painpoints', 'pain', 'issue', 'issues', 'challenge', 'challenges'],
    keywords: [['problem'], ['pain'], ['issue'], ['challeng']],
  },
  {
    field: 'solution',
    aliases: ['solution', 'solutions', 'whatsthesolution', 'thesolution', 'oursolution', 'pitch', 'offer', 'proposedsolution', 'servicetopitch'],
    keywords: [['solution'], ['pitch'], ['offer']],
  },
  {
    field: 'bestCallTime',
    aliases: ['bestcalltime', 'besttimetocall', 'calltime', 'besttime', 'timetocall', 'calltimes', 'callwindow', 'bestcallingtime'],
    keywords: [['time', 'call'], ['best', 'time'], ['call', 'window']],
    exclude: ['called'],
  },
  {
    field: 'businessHours',
    aliases: ['businesshours', 'hours', 'openinghours', 'openhours', 'workinghours', 'officehours', 'availability', 'timings'],
    keywords: [['hour'], ['availab'], ['opening']],
  },
  {
    field: 'businessName',
    aliases: ['businessname', 'business', 'company', 'companyname', 'name', 'organization', 'organisation', 'brand'],
    keywords: [['business', 'name'], ['company']],
  },
  {
    field: 'personName',
    aliases: ['personname', 'person', 'contactname', 'contact', 'owner', 'ownername', 'contactperson', 'decisionmaker', 'firstname', 'fullname'],
    keywords: [['person'], ['owner']],
  },
  {
    field: 'contact',
    aliases: ['phone', 'phonenumber', 'mobile', 'number', 'tel', 'telephone', 'cell', 'contactnumber', 'whatsapp'],
    keywords: [['phone'], ['mobile']],
  },
  {
    field: 'email',
    aliases: ['email', 'emailaddress', 'mail', 'emailid'],
    keywords: [['email']],
  },
  {
    field: 'website',
    aliases: ['website', 'url', 'web', 'site', 'websiteurl', 'domain', 'link'],
    keywords: [['website'], ['url']],
  },
  {
    field: 'location',
    aliases: ['location', 'city', 'address', 'area', 'region', 'state', 'country'],
    keywords: [['location'], ['address']],
  },
  {
    field: 'notes',
    aliases: ['notes', 'note', 'comments', 'comment', 'remark', 'remarks', 'description', 'about', 'summary'],
    keywords: [['note'], ['comment'], ['remark'], ['descri']],
  },
  {
    field: 'status',
    aliases: ['status', 'leadstatus', 'stage'],
  },
];

/** "Best Time-to Call " -> "besttimetocall" */
export const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

const headerWords = (header: string) =>
  header.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Edit distance where swapping two adjacent letters ("Probelm") costs 1. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Score how well a header matches a rule; 0 means no match. */
function scoreHeader(header: string, rule: FieldRule): number {
  const norm = normalizeHeader(header);
  if (!norm) return 0;
  const words = headerWords(header);

  if (rule.exclude?.some((ex) => words.includes(ex))) return 0;

  // 1. Exact alias. Earlier aliases are more specific, so they score higher.
  const aliasIdx = rule.aliases.indexOf(norm);
  if (aliasIdx !== -1) return 100 - aliasIdx;

  // 2. Every stem of a keyword group appears in the header words.
  if (rule.keywords?.some((group) => group.every((stem) => words.some((w) => w.startsWith(stem))))) {
    return 60;
  }

  // 3. Typo tolerance against longer aliases ("Probelm", "Soluton").
  for (const alias of rule.aliases) {
    if (alias.length < 5) continue;
    const allowed = alias.length >= 9 ? 2 : 1;
    if (Math.abs(alias.length - norm.length) <= allowed && editDistance(norm, alias) <= allowed) {
      return 40;
    }
  }

  return 0;
}

/**
 * Map each spreadsheet header to at most one lead field, and each field to at
 * most one header (the highest-scoring one).
 */
export function buildHeaderMap(headers: string[]): Map<string, ImportField> {
  const candidates: { header: string; field: ImportField; score: number; order: number }[] = [];
  headers.forEach((header) => {
    RULES.forEach((rule, order) => {
      const score = scoreHeader(header, rule);
      if (score > 0) candidates.push({ header, field: rule.field, score, order });
    });
  });

  candidates.sort((a, b) => b.score - a.score || a.order - b.order);

  const result = new Map<string, ImportField>();
  const takenFields = new Set<ImportField>();
  for (const c of candidates) {
    if (result.has(c.header) || takenFields.has(c.field)) continue;
    result.set(c.header, c.field);
    takenFields.add(c.field);
  }
  return result;
}

const formatClock = (minutes: number) => {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** "9am", "9:30 AM", "17:00" -> minutes after midnight */
function parseClock(raw: string, fallbackMeridiem?: 'am' | 'pm'): number | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = (match[3]?.replace(/\./g, '') as 'am' | 'pm' | undefined) ?? fallbackMeridiem;
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Suggest a call window from business hours such as "Mon-Fri 9am-5pm".
 * Owners are easiest to reach an hour after opening, once the morning rush
 * has settled, so the window is opening+1h to opening+2.5h (clamped to the
 * close time). Returns '' when the hours can't be parsed.
 */
export function inferBestCallTime(businessHours: string): string {
  if (!businessHours) return '';
  const range = businessHours.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i
  );
  if (!range) return '';

  const close = parseClock(range[2], 'pm');
  const open = parseClock(range[1], 'am');
  if (open === null || close === null || close <= open) return '';

  const start = open + 60;
  const end = Math.min(open + 150, close - 30);
  if (end <= start) return '';

  const days = businessHours.slice(0, range.index).trim().replace(/[,:]$/, '');
  return `${days ? `${days}, ` : ''}${formatClock(start)} – ${formatClock(end)}`;
}
