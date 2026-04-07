"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { navItems } from "@/constants";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import FileUploader from "@/components/FileUploader";
import ThemeToggle from "@/components/ThemeToggle";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { cva } from "class-variance-authority";

const mobileHeader = cva("flex h-[60px] justify-between px-5 sm:hidden");
const userRow = cva(
  "my-3 flex items-center gap-2 rounded-full p-1 text-light-100 sm:justify-center sm:bg-brand/10 sm:dark:bg-light-300/20 lg:justify-start lg:p-3",
);
const mobileNav = cva("flex flex-1 flex-col gap-1 text-brand dark:text-light-100");
const mobileNavList = cva("flex flex-1 flex-col gap-4");
const mobileNavItem = cva(
  "flex h-[52px] w-full items-center justify-start gap-4 rounded-full px-6 text-light-100",
);
const mobileSignOutButton = cva(
  "flex h-[52px] w-full items-center gap-4 rounded-full bg-brand/10 px-6 text-brand shadow-none transition-all hover:bg-brand/20 dark:bg-light-300/20 dark:text-light-100 dark:hover:bg-light-300/30",
);

interface Props {
  fullName: string;
  avatar: string;
  email: string;
}

const MobileNavigation = ({
  fullName,
  avatar,
  email,
}: Props) => {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className={mobileHeader()}>
      <Image
        src="/assets/icons/logo-full-brand.svg"
        alt="logo"
        width={120}
        height={52}
        className="h-auto dark:hidden"
      />
      <Image
        src="/assets/icons/logo-full.svg"
        alt="logo"
        width={120}
        height={52}
        className="hidden h-auto dark:block"
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Image
            src="/assets/icons/menu.svg"
            alt="Search"
            width={30}
            height={30}
            className="dark:invert"
          />
        </SheetTrigger>
        <SheetContent className="shad-sheet h-screen px-3">
          <SheetTitle>
            <div className={userRow()}>
              <Image
                src={avatar}
                alt="avatar"
                width={44}
                height={44}
                className="header-user-avatar"
              />
              <div className="sm:hidden lg:block">
                <p className="subtitle-2 capitalize">{fullName}</p>
                <p className="caption">{email}</p>
              </div>
            </div>
            <Separator className="mb-4 bg-light-200/20" />
          </SheetTitle>

          <nav className={mobileNav()}>
            <ul className={mobileNavList()}>
              {navItems.map(({ url, name, icon }) => (
                <Link key={name} href={url} className="lg:w-full">
                  <li
                    className={cn(
                      mobileNavItem(),
                      pathname === url && "shad-active",
                    )}
                  >
                    <Image
                      src={icon}
                      alt={name}
                      width={24}
                      height={24}
                      className={cn(
                        "nav-icon",
                        pathname === url && "nav-icon-active",
                      )}
                    />
                    <p>{name}</p>
                  </li>
                </Link>
              ))}
            </ul>
          </nav>

          <Separator className="my-5 bg-light-200/20" />

          <div className="flex flex-col justify-between gap-5 pb-5">
            <FileUploader />
            <ThemeToggle mobile />
            <SignOutButton>
              <Button
                type="button"
                className={mobileSignOutButton()}
                disabled={!isSignedIn}
              >
                <Image
                  src="/assets/icons/logout.svg"
                  alt="logo"
                  width={24}
                  height={24}
                />
                <p>Logout</p>
              </Button>
            </SignOutButton>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default MobileNavigation;
