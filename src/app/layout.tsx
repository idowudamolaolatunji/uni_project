import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { poppins } from "@/fonts";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic Resource Recommender",
  description:
    "Personalized academic resource recommendations using a hybrid Jaccard + Cosine similarity engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
