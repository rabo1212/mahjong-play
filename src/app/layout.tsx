import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f1a",
};

export const metadata: Metadata = {
  title: "MahjongPlay - 마작플레이",
  description: "중국식 마작(국표마작) 온라인 게임 — AI 연습 + 온라인 대전",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MahjongPlay",
  },
  openGraph: {
    title: "MahjongPlay - 마작플레이",
    description: "중국식 마작(국표마작) 온라인 게임 — AI 연습 + 온라인 대전",
    url: "https://mahjong-play-rho.vercel.app",
    siteName: "MahjongPlay",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MahjongPlay - 마작플레이",
    description: "중국식 마작(국표마작) 온라인 게임",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
