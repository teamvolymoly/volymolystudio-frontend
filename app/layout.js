import "./globals.css";

export const metadata = {
  title: "Volymoly Login",
  description: "Volymoly authentication flow",
  referrer: "no-referrer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
