import React from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 dark:bg-dark-100 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-gradient-to-br from-brand via-brand/95 to-[#7b1f54] p-10 lg:flex xl:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 size-96 rounded-full bg-black/10 blur-3xl" />
            <div className="absolute left-1/2 top-1/3 size-40 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10 flex w-full max-w-[560px] flex-col justify-between gap-10">
            <div className="space-y-10">
              <Image
                src="/assets/icons/logo-full.svg"
                alt="Medusa logo"
                width={228}
                height={84}
                className="h-auto w-[220px]"
              />

              <div className="space-y-5 text-white">
                <p className="caption uppercase tracking-[0.28em] text-white/75">
                  Medusa Cloud Workspace
                </p>
                <h1 className="max-w-[14ch] text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">
                  Store, share, and organize files with confidence.
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/85 xl:text-lg">
                  A premium workspace built for secure file access, fast uploads,
                  and structured collaboration across teams.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Private file delivery",
                  "Scoped Appwrite sessions",
                  "Simple team sharing",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-medium text-white/90 backdrop-blur-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">Trusted by teams</p>
                  <p className="text-2xl font-semibold text-white">Fast, secure, polished</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80">
                  Clerk-powered auth
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Access</p>
                  <p className="mt-1 text-base font-semibold text-white">Controlled</p>
                </div>
                <div className="rounded-2xl bg-black/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Uploads</p>
                  <p className="mt-1 text-base font-semibold text-white">Direct</p>
                </div>
                <div className="rounded-2xl bg-black/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Sharing</p>
                  <p className="mt-1 text-base font-semibold text-white">Simple</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <ThemeToggle />
          </div>

          <div className="w-full max-w-[560px]">
            <div className="mb-6 flex items-center justify-center lg:hidden">
              <Image
                src="/assets/icons/logo-full-brand.svg"
                alt="Medusa logo"
                width={220}
                height={84}
                className="h-auto w-[190px] dark:brightness-0 dark:invert"
              />
            </div>

            <div className="rounded-[32px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-dark-200/95 sm:p-8">
              {children}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-light-200">
              Secure authentication powered by Clerk.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Layout;