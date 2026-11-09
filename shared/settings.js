// The shared key's limits. The password limits who uses it, so there is no daily time limit. The published page
// (GitHub Pages) is the only other address allowed to ask for passes.
export const DEFAULTS = Object.freeze({
  origins: ['https://accent.demadriz.com'],
  maxSessions: 3,          // the most conversations a free Gemini key allows at once
  sessionMinutes: 15,      // one practice conversation (the most Gemini Live allows). Gemini ends it when its pass expires
  minutesPerIpPerDay: 0,   // no daily time limit per visitor: the password limits who practises
  perIpPerHour: 20,        // conversations started per visitor address per hour, against runaway pages
  perDay: 200,
});

// Conversations on the visitor's own key: their key, their limits.
export const OWN_KEY_MINUTES = 15;
