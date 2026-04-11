import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceGenie — فواتير ZATCA بلمسة واحدة",
  description:
    "توليد فواتير ضريبية مبسطة متوافقة مع ZATCA من رسالة نصية أو صوتية.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
