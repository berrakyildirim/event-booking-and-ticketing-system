import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "EventHub",
  description: "Book tickets for events near you",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/*
          AuthProvider wraps the entire app so every client component in the tree
          can call useAuth() to read the current user and auth-loading state.
          Navbar sits inside the provider so it can respond to login/logout events.
        */}
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
