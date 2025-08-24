import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CssVarsProvider } from "@mui/joy";
import { PlayingProvider } from "./hooks/usePlaying";
import MusicHandler from "./components/MusicHandler";
import { extendTheme } from '@mui/joy/styles';
import JoyProvider from "./components/JoyProvider";

const geistSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "generic-modular-music-app",
  description: "Frontend for a generic modular music app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="GMMA" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/default-artwork.png" />
      </head>
      <body className={`${geistSans.variable}`}>
        <JoyProvider>
          <PlayingProvider>
            <MusicHandler />
            {children}
          </PlayingProvider>
        </JoyProvider>
      </body>
    </html>
  );
}
