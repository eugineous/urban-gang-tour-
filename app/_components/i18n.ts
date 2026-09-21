export const SW: Record<string, string> = {
  'Home': 'Nyumbani',
  'Shop': 'Duka',
  'Events': 'Matukio',
  'Gallery': 'Picha',
  'News': 'Habari',
  'Contact': 'Wasiliana',
  'About': 'Kuhusu',
  'Book Us': 'Tupigie',
  'The Gang': 'Genge',
  'Experience': 'Uzoefu',
  'Explore': 'Chunguza',
  'Get tickets': 'Pata tiketi',
  'Buy now': 'Nunua sasa',
  'Book now': 'Weka nafasi',
  'Submit': 'Wasilisha',
  'Next stop': 'Kituo kinachofuata',
  'Partners': 'Washirika',
  'Marketplace': 'Soko',
  'Urban News': 'Habari za Mjini',
  'Find your fit': 'Pata saizi yako',
  'Choose your lane': 'Chagua njia yako',
  'Loading': 'Inapakia',
  'Search': 'Tafuta',
  'Filter': 'Chuja',
  'Sort': 'Panga',
  'Close': 'Funga',
  'Back': 'Rudi',
  'Next': 'Mbele',
  'Share': 'Shiriki',
};

export type Lang = 'en' | 'sw';

export function t(key: string, lang: Lang): string {
  if (lang === 'sw' && SW[key]) return SW[key];
  return key;
}
