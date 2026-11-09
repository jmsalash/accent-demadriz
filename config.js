// Where the service (password check, practice passes, the coach's word recordings) is. On this computer or the home
// network: the address this page came from. Anywhere else (the published website): the Cloudflare Worker, whose
// address the publish step writes here.
export const WORKER_URL = 'https://accent-coach.shy-star-fcf2.workers.dev';

export function serviceFor(host, worker = WORKER_URL) {
  const local = host === 'localhost' || host.endsWith('.local') || host.includes(':')
    || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host);
  return local ? '' : worker;
}

export const SERVICE_URL = serviceFor(typeof location === 'undefined' ? 'localhost' : location.hostname);
