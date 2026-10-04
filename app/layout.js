import "./globals.css";

export const metadata = {
  title: "Volymoly Login",
  description: "Volymoly authentication flow"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
