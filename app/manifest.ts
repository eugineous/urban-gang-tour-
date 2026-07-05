import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Urban Gang Tour",
    short_name: "Urban Gang Tour",
    description:
      "Urban Gang Tour is a Kenyan events company running a youth talent search, mentorship, and awards concert tour countrywide.",
    start_url: "/",
    display: "standalone",
    background_color: "#150E13",
    theme_color: "#150E13",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
