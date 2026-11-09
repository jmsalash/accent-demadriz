// What to tell the visitor when something goes wrong, and whether to offer Settings.
export const KEY_LINK = 'https://aistudio.google.com/apikey';

export function messageFor(code, { ownKey = false } = {}) {
  if (ownKey && code === 'quota') return { text: "Your Gemini key's free limit is used up for now.", settings: true };
  if (code === 'badkey') return { text: 'Your Gemini key was not accepted. Check it in Settings.', settings: true };
  switch (code) {
    case 'password': return { text: 'That password is not right. Ask the person who shared this website.', settings: false };
    case 'quota': return { text: "The free key can't serve any more practice right now. You can create your own free Gemini key and add it in Settings.", settings: true, link: true };
    case 'daily': return { text: "You've used today's free practice time on the shared key. Create your own free Gemini key and add it in Settings, or come back tomorrow.", settings: true, link: true };
    case 'busy': return { text: 'The free key is busy, please try again in a minute, or add your own key in Settings.', settings: true };
    case 'rate': return { text: "You've reached the practice limit for now, please try again later.", settings: false };
    case 'offline': return { text: 'Practice is not available right now. You can still practise with your own key, added in Settings.', settings: true };
    case 'mic': return { text: 'The microphone is needed to practise. Allow it in your browser and try again.', settings: false };
    case 'insecure': return { text: 'The microphone needs a secure (https) page. Open the https address of this site.', settings: false };
    case 'dropped': return { text: 'The connection was cut off. Click the eye to carry on.', settings: false };
    case 'limit': return { text: "Time's up for this session. Click the eye to carry on where you left off.", settings: false };
    default: return { text: 'Something went wrong, please try again.', settings: false };
  }
}
