/**
 * Identity logos for messaging inbox/chat.
 * Maps identityId to logo image source; fallback Canny Carrot icon.
 */

let ccIcon: number | null = null;
let stablesIcon: number | null = null;

try {
  ccIcon = require('../../assets/cc-icon-no-background.png');
} catch {
  ccIcon = null;
}
try {
  stablesIcon = require('../../assets/stables-icon.png');
} catch {
  stablesIcon = null;
}

const ID_TO_LOGO: Record<string, number | null> = {
  'the-stables': stablesIcon ?? ccIcon,
  stables: stablesIcon ?? ccIcon,
};

export function getMessagingLogo(identityId?: string | null): number | null {
  if (!identityId) return ccIcon;
  const id = String(identityId).toLowerCase().trim();
  return ID_TO_LOGO[id] ?? ccIcon;
}

export function useLogoForIdentity(identityId?: string | null): boolean {
  return identityId != null && String(identityId).trim() !== '';
}
