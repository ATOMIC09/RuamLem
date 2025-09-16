import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";

const kanitFont = Kanit({
  subsets: ["latin"],
  weight: '200',
});

export const metadata: Metadata = {
  title: "RuamLem",
  description: "Learn Smarter, Not Harder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${kanitFont.className} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
