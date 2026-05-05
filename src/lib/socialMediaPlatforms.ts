/** Allowed platforms in Settings → Social (stored as plain text in DB). */
export const SOCIAL_MEDIA_PLATFORMS = [
  'Facebook',
  'Instagram',
  'LinkedIn',
  'YouTube',
  'X (Twitter)',
  'TikTok',
  'Threads',
  'Pinterest',
  'WhatsApp',
  'Telegram',
  'Viber',
  'Reddit',
  'Discord',
  'Snapchat',
  'Google Business Profile',
  'LINE',
  'WeChat',
  'Website',
  'Other',
] as const;

export type SocialMediaPlatform = (typeof SOCIAL_MEDIA_PLATFORMS)[number];
