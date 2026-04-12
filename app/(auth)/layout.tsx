import React from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-dark-100">
      <section className="relative hidden w-1/2 overflow-hidden bg-brand p-10 lg:flex xl:w-2/5">
        <div className="pointer-events-none absolute -left-16 -top-14 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -right-10 size-72 rounded-full bg-white/20 blur-3xl" />

        <div className="relative z-10 flex max-h-[860px] max-w-[430px] flex-col justify-center space-y-10">
          <Image
            src="/assets/icons/logo-full.svg"
            alt="logo"
            width={224}
            height={82}
            className="h-auto"
          />

          <div className="space-y-4 text-white">
            <p className="caption uppercase tracking-[0.22em] text-white/80">
              Medusa Cloud Workspace
            </p>
            <h1 className="h1">Store, share, and organize files without chaos</h1>
            <p className="body-1">
              Your central place for documents, media, and collaboration.
            </p>
          </div>

          <ul className="space-y-3 text-white/90">
            <li className="subtitle-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm">
              Private file access through protected routes
            </li>
            <li className="subtitle-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm">
              Fast uploads with scoped Appwrite sessions
            </li>
            <li className="subtitle-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm">
              Share and manage every file in one dashboard
            </li>
          </ul>

          <Image
            src="/assets/images/files-2.png"
            alt="Medusa preview"
            width={506}
            height={418}
            className="w-full max-w-[380px] drop-shadow-2xl transition-all hover:scale-[1.02]"
          />
        </div>
      </section>

      <section className="relative flex flex-1 flex-col items-center bg-light-400/40 p-4 py-10 dark:bg-dark-100 lg:justify-center lg:p-10 lg:py-0">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="mb-12 lg:hidden">
          <Image
            src="/assets/icons/logo-full-brand.svg"
            alt="logo"
            width={224}
            height={82}
            className="h-auto w-[210px] dark:brightness-0 dark:invert lg:w-[250px]"
          />
        </div>

        <div className="w-full max-w-[460px]">{children}</div>
      </section>
    </div>
  );
};

export default Layout;
