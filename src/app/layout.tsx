import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Basis URL absolut untuk metadata sosial. Vercel menyediakan VERCEL_URL saat
 * build; NEXT_PUBLIC_SITE_URL dipakai kalau domainnya sudah tetap. Fallback
 * localhost dipilih agar `next build` lokal tidak memancarkan peringatan
 * metadataBase — bukan karena localhost berguna sebagai tautan.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "EventTwin — Simulasikan dampak acara sebelum terjadi";
const description =
  "Digital twin acara: bandingkan skenario penyelenggaraan pada empat dimensi — sampah, energi, biaya, dan inklusi — sebelum acara berlangsung.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "EventTwin",
  // F8 membagikan skenario lewat tautan; tanpa metadata ini tautannya muncul
  // tanpa pratinjau di WhatsApp dan grup panitia.
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "EventTwin",
    title,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
