export interface Album {
  slug: string;
  name: string;
  tag: string;
  count: number;
  pos: string;
  photos: string[];
}

function mkAlbum(slug: string, name: string, tag: string, count: number, pos: string): Album {
  const photos = Array.from({ length: count }, (_, i) => `/assets/news/albums/${slug}/${i + 1}.jpg`);
  return { slug, name, tag, count, pos, photos };
}

export const GUEST_ALBUMS: Album[] = [
  mkAlbum("bobby", "Bobby Junior", "Guest Artist", 5, "center 22%"),
  mkAlbum("hype", "Hype Nollan", "Personality", 5, "center 16%"),
  mkAlbum("kalamu", "Kalamu Nyeusi", "Spoken Word", 5, "center 14%"),
  mkAlbum("moraa", "Moraa", "Campus Story", 4, "center 20%"),
  mkAlbum("tamre", "Tamre", "Pageant Feature", 4, "center 16%"),
  mkAlbum("xl3", "XL3", "Crew Feature", 5, "center 16%"),
  mkAlbum("amanda", "Amanda", "On The Road", 4, "center 28%"),
  mkAlbum("eugine", "Eugine Micah", "Host, Off Camera", 3, "center 22%"),
];

export const SESSION_ALBUMS: Album[] = [
  mkAlbum("blueday", "Blue Day", "Theme Day, 21 May", 7, "center 30%"),
  mkAlbum("xmas", "School Christmas", "Festive Special", 5, "center 28%"),
];

// Real pixel dimensions (not guessed) so next/image can size these correctly
// in the CSS-column masonry layout without cropping to a forced aspect ratio.
export const STUDIO_GALLERY = [
  { src: "/assets/news/min/gal1.jpg", width: 1400, height: 1399 },
  { src: "/assets/news/min/gal5.jpg", width: 1400, height: 1867 },
  { src: "/assets/news/min/gal8.jpg", width: 1400, height: 1050 },
  { src: "/assets/news/min/gal2.jpg", width: 1400, height: 2096 },
  { src: "/assets/news/min/gal7.jpg", width: 1400, height: 1400 },
  { src: "/assets/news/min/gal4.jpg", width: 1400, height: 2096 },
  { src: "/assets/news/min/gal6.jpg", width: 1400, height: 1401 },
  { src: "/assets/news/min/gal3.jpg", width: 1400, height: 1750 },
  { src: "/assets/news/min/gal9.jpg", width: 1400, height: 2096 },
];

export const SEGMENTS = [
  "Show intro with the hosts on location",
  "School and institution feature",
  "Student interviews and stories",
  "Club visits and campus culture",
  "Showcase highlights and winner moments",
  "Principal and leadership interviews",
  "Behind the scenes with the crew",
  "Outro with next stop tease",
];
