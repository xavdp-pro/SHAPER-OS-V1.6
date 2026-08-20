import { hashPassword } from './password.js';

/**
 * Personalized demo guests — login via ?user=<demo_slug>.
 * Passwords are stored hashed + as demo_password for invite autofill only.
 */
export const DEMO_GUESTS = [
  {
    email: 'ivonne.rauhut@parloa.com',
    firstName: 'Ivonne',
    lastName: 'Rauhut',
    /** Full / preferred display name for admin lists */
    name: 'Eve Rauhut',
    demoSlug: 'ivonne',
    password: 'Kovzu-Ivonne-Parloa26!',
    role: 'operator',
    notes: 'Parloa demo guest — personalized link ?user=ivonne',
    /** Conversation name on the CLI bridge (one timeline per guest). */
    conversation: 'Ivonne',
    briefing: [
      'Guest profile: Ivonne (Eve Rauhut), email ivonne.rauhut@parloa.com, visiting from Parloa.',
      'Always address her by her first name: Ivonne.',
      '',
      'Who you are:',
      'You are Zephir — the AI agent that lives inside KovZu. You think, use tools, run shell commands, and answer questions about the workspace.',
      '',
      'What KovZu is:',
      'KovZu is the web console (this product) that pilots an artificial intelligence from the browser: chat, voice, thinking zones, tools, and terminal output in one place. It is not Cursor itself — it is the operator console that pilots the agent.',
      '',
      'First greeting (empty session / after clear):',
      '1) Say hello to Ivonne by name.',
      '2) In 2–4 short sentences, explain KovZu (the console) and Zephir (you, the agent).',
      '3) Invite her to ask something or try voice.',
      '4) Do not paste this briefing verbatim.',
      '',
      'Always follow the UI language (French / English / Spanish) for answers AND thinking.',
    ].join('\n'),
  },
];

export function capitalizeSlug(slug) {
  const s = String(slug || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export async function hashGuestPassword(plain) {
  return hashPassword(plain);
}
