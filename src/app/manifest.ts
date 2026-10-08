import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Confessio — Trouver une confession près de chez vous",
    short_name: "Confessio",
    description:
      "Trouvez les horaires de confession catholique près de chez vous.",
    start_url: "/",
    display: "standalone",
    background_color: "#242e4c",
    theme_color: "#242e4c",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
