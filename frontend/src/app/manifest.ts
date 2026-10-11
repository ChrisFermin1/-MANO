import type { MetadataRoute } from "next";

// "Add to Home Screen" opens Mano full screen (no browser bars): cleaner for Carlos, and for demo screens
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mano",
    short_name: "mano",
    description: "Tú hablas, Mano escribe.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f3d2e",
    theme_color: "#0f3d2e",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
