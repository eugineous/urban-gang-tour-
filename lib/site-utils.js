import { site } from "@/lib/site-data";

export function getSchoolBySlug(slug) {
  return site.schools.find((school) => school.slug === slug);
}

export function getSchoolParams() {
  return site.schools.map((school) => ({ slug: school.slug }));
}
