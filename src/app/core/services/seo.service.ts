import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/translations';

const SITE_URL = 'https://sudokurival.me';
const OG_IMAGE = `${SITE_URL}/assets/seo/og-default.png`;
const LOGO_IMAGE = `${SITE_URL}/assets/seo/logo-512.png`;
const OG_IMAGE_ALT = 'Sudoku Rival - Play Sudoku Online';

type SeoKey = 'home' | 'play' | 'howToPlay' | 'settings' | 'privacy' | 'terms' | 'leaderboard' | 'default';

const PUBLIC_PATH_KEYS = new Map<string, SeoKey>([
  ['/', 'home'],
  ['/play', 'play'],
  ['/how-to-play', 'howToPlay'],
  ['/settings', 'settings'],
  ['/privacy', 'privacy'],
  ['/terms', 'terms'],
  ['/leaderboard', 'leaderboard'],
]);

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  applyForUrl(url: string): void {
    const lang = this.i18n.languageFromUrl(url) ?? this.i18n.lang();
    const path = this.pathOnly(this.i18n.stripLanguagePrefix(url));
    const key = PUBLIC_PATH_KEYS.get(path) ?? 'default';
    const indexable = PUBLIC_PATH_KEYS.has(path);
    const title = this.i18n.t(`seo.${key}.title`);
    const description = this.i18n.t(`seo.${key}.description`);
    const canonicalPath = PUBLIC_PATH_KEYS.has(path) ? path : '/';
    const canonical = this.absoluteUrl(lang, canonicalPath);

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });

    // Robots: include max-image-preview:large for public indexable pages
    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index,follow,max-image-preview:large' : 'noindex, nofollow',
    });

    // Open Graph core tags (unchanged)
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: this.i18n.t('seo.siteName') });
    this.meta.updateTag({ property: 'og:locale', content: lang === 'ar' ? 'ar_EG' : 'en_US' });
    this.meta.updateTag({ property: 'og:locale:alternate', content: lang === 'ar' ? 'en_US' : 'ar_EG' });

    // Open Graph image tags
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:secure_url', content: OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/png' });
    this.meta.updateTag({ property: 'og:image:alt', content: OG_IMAGE_ALT });

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:image:alt', content: OG_IMAGE_ALT });

    this.upsertCanonical(canonical);
    this.upsertHreflang(canonicalPath);
    this.upsertStructuredData(lang);
  }

  private absoluteUrl(lang: LanguageCode, path: string): string {
    return `${SITE_URL}/${lang}${path === '/' ? '' : path}`;
  }

  private pathOnly(url: string): string {
    const path = url.match(/^([^?#]*)/)?.[1] || '/';
    return path || '/';
  }

  private upsertCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = href;
  }

  private upsertHreflang(path: string): void {
    this.document.head
      .querySelectorAll('link[rel="alternate"][data-seo-managed="true"]')
      .forEach((node) => node.remove());

    const alternates: Array<{ hreflang: string; href: string }> = [
      { hreflang: 'en', href: this.absoluteUrl('en', path) },
      { hreflang: 'ar', href: this.absoluteUrl('ar', path) },
      { hreflang: 'x-default', href: this.absoluteUrl('en', path) },
    ];

    for (const item of alternates) {
      const link = this.document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = item.hreflang;
      link.href = item.href;
      link.dataset['seoManaged'] = 'true';
      this.document.head.appendChild(link);
    }
  }

  private upsertStructuredData(lang: LanguageCode): void {
    const id = 'sudoku-rival-structured-data';
    let script = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.text = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Sudoku Rival',
        url: `${SITE_URL}/`,
        image: OG_IMAGE,
        inLanguage: ['en', 'ar'],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Sudoku Rival',
        url: `${SITE_URL}/`,
        image: OG_IMAGE,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        inLanguage: ['en', 'ar'],
        description: this.i18n.t('seo.default.description'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EGP',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Sudoku Rival',
        url: `${SITE_URL}/`,
        logo: LOGO_IMAGE,
        image: OG_IMAGE,
      },
    ]);
  }
}
