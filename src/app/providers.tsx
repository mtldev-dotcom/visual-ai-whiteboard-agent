"use client";

import { SessionProvider } from "next-auth/react";

import { ReminderNotifier } from "./components/ReminderNotifier";
import { ThemeProvider } from "./components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <ReminderNotifier />
      </ThemeProvider>
    </SessionProvider>
  );
}
