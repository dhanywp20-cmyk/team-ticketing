import './globals.css';

export const metadata = {
  title: 'Reminder Troubleshooting PTS IVP',
  description: 'Sistem ticketing untuk tim support IndoVisual',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}

