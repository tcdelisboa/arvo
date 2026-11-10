import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/privacy", "/risk"],
        disallow: ["/api/", "/overview", "/spending", "/portfolio", "/markets", "/accounts", "/settings", "/welcome"],
      },
    ],
  };
}
