export interface ShareWinOptions {
  title: string;
  text: string;
  url?: string;
}

export function buildShareUrl(
  destination: 'x' | 'facebook' | 'linkedin',
  options: ShareWinOptions,
): string {
  const url = options.url ?? globalThis.location.origin;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(options.text);

  if (destination === 'x') {
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }

  if (destination === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
  }

  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

export async function shareWin(options: ShareWinOptions): Promise<boolean> {
  if ('share' in navigator && typeof navigator.share === 'function') {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url ?? globalThis.location.origin,
    });
    return true;
  }

  return false;
}

export async function copyShareText(options: ShareWinOptions): Promise<void> {
  const url = options.url ?? globalThis.location.origin;
  await navigator.clipboard.writeText(`${options.text} ${url}`);
}
