import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friendsgiving 🎄 Sat 21 Nov",
  description: "Festive Friendsgiving: teams, games, Secret Santa and the ugly T-shirt swap.",
};

export const viewport: Viewport = { themeColor: "#13261F", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* Opt into the OS text-size setting (Dynamic Type / Android font size) */}
        <meta name="text-scale" content="scale" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Nunito+Sans:wght@400;700&display=swap"
        />
      </head>
      <body>
        <div className="snow" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
