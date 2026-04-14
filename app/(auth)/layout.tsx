import React from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 dark:bg-dark-100 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(155deg,#7f2557_0%,#9f2b68_42%,#4b163f_100%)] p-10 lg:flex xl:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 size-[30rem] rounded-full bg-[#2d0f25]/45 blur-3xl" />
            <div className="absolute left-1/2 top-1/3 size-48 -translate-x-1/2 rounded-full bg-white/10 blur-[90px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_82%_80%,rgba(0,0,0,0.28),transparent_50%)]" />
          </div>

          <div className="relative z-10 flex w-full max-w-[600px] flex-col justify-between gap-12">
            <div className="space-y-11">
              <Image
                src="/assets/icons/logo-full.svg"
                alt="Medusa logo"
                width={228}
                height={84}
                className="h-auto w-[220px]"
              />

              <div className="space-y-6 text-white">
                <p className="caption uppercase tracking-[0.3em] text-white/70">
                  Medusa Cloud Workspace
                </p>
                <h1 className="max-w-[13ch] text-5xl font-semibold leading-[1.02] tracking-[-0.04em] xl:text-6xl">
                  Secure file operations for teams that move fast.
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/80 xl:text-lg">
                  A modern control layer for uploading, sharing, and retrieving files
                  with clear ownership boundaries and dependable access flows.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Private file delivery",
                  "Scoped auth sessions",
                  "Structured team sharing",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/20 bg-black/15 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Workspace posture</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Security-first by default</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                  Clerk + Appwrite
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Access", value: "Policy based" },
                  { title: "Uploads", value: "Direct and scoped" },
                  { title: "Sharing", value: "Audit friendly" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-[#00000026] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">{item.title}</p>
                    <p className="mt-1 text-base font-semibold text-white">{item.value}</p>
                  </div>
                ))}
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