"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Search from "@/components/Search";
import FileUploader from "@/components/FileUploader";
import ThemeToggle from "@/components/ThemeToggle";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { cva } from "class-variance-authority";

const headerContainer = cva(
  "hidden items-center justify-between gap-5 p-5 sm:flex lg:py-7 xl:gap-10",
);

const headerActions = cva("flex min-w-fit items-center justify-center gap-4");

const signOutButton = cva(
  "flex h-[52px] min-w-[54px] items-center justify-center rounded-full bg-brand/10 p-0 text-brand shadow-none transition-all hover:bg-brand/20",
);

const Header = () => {
  const { user } = useUser();

  return (
    <header className={headerContainer()}>
      <Search />
      <div className={headerActions()}>
        <FileUploader />
        <ThemeToggle />
        <SignOutButton>
          <Button
            type="button"
            className={signOutButton()}
            disabled={!user}
          >
            <Image
              src="/assets/icons/logout.svg"
              alt="logo"
              width={24}
              height={24}
              className="w-6"
            />
          </Button>
        </SignOutButton>
      </div>
    </header>
  );
};
export default Header;
