import { Suspense } from "react";

import { isSignupEnabled } from "@/lib/signup";

import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm signupEnabled={isSignupEnabled()} />
    </Suspense>
  );
}
