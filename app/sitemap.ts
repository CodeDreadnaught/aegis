import type { MetadataRoute } from "next";

const lastModified = "2026-09-04T00:00:00.000Z";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", process.env.BASE_URL).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
