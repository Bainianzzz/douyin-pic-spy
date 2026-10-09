import { detectLocale } from 'typesafe-i18n/detectors';
import type { Locales } from './i18n-types';
import { baseLocale, i18nObject, locales } from './i18n-util';
import { loadLocale } from './i18n-util.sync';

/** Any Chinese variant (zh-CN, zh-TW, zh-Hans-CN…) uses the zh-CN translation. */
const browserLocales = (): string[] => {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.map((lang) => (lang.toLowerCase().startsWith('zh') ? 'zh-CN' : lang));
};

const locale: Locales = detectLocale(baseLocale, locales, browserLocales);
loadLocale(locale);

export const L = i18nObject(locale);
