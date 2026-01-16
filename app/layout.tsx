import './globals.css';

export const metadata = {
  title: 'Reminder Troubleshooting',
  description: 'PTS IVP Teams',
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
