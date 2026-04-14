import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAuthAppearance } from "../../clerk-appearance";

const SignInPage = () => (
  <div className="space-y-8">
    <div className="space-y-3 text-center">
      <p className="caption uppercase tracking-[0.22em] text-light-200">
        Welcome back
      </p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
        Sign in to Medusa
      </h1>
      <p className="mx-auto max-w-md text-sm leading-6 text-slate-600 dark:text-light-200 sm:text-base">
        Continue managing your files, teams, and secure workspace with one fast login.
      </p>
    </div>

    <div className="auth-signin-card rounded-[28px] border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-dark-100/60 sm:p-5">
      <ClerkLoading>
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-dark-100/70">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-300">
            <span className="inline-block size-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            Preparing secure sign-in...
          </div>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
          appearance={clerkAuthAppearance}
        />
      </ClerkLoaded>
    </div>

    <p className="caption text-center text-light-200">
      Don&apos;t have an account?{" "}
      <Link
        href="/sign-up"
        className="font-semibold text-brand transition-colors hover:text-brand-100"
      >
        Sign up
      </Link>
    </p>
  </div>
);

export default SignInPage;