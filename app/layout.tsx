import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '數學任務站｜老高奧里長',
  description: '七、八、九年級數學學習扶助、班級任務與個人學習分析。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
