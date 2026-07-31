import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Collagility — The Multiplayer Terminal for AI Coding Agents',
  description: 'Connect local AI coding agents across developers. One workspace. Multiple developers. One AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0c0e] text-[#ededed] min-h-screen antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
