import './globals.css';

export const metadata = {
  title: 'Team Ticketing System',
  description: 'Sistem ticketing untuk tim support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}