import type { MetadataRoute } from "next";
import { PLACE_DEFINITIONS } from "@/data/places";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/crowd`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    ...PLACE_DEFINITIONS.map((place) => ({
      url: `${base}/place/${place.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
