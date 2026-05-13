import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "바이너스 콘텐츠 빌더",
  description: "바이너스프레드 SNS 콘텐츠 수집 및 제작 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
