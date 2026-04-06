"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Search from "@/components/Search";
import FileUploader from "@/components/FileUploader";
import { SignOutButton, useUser } from "@clerk/nextjs";

const Header = () => {
  const { user } = useUser();

  return (
    <header className="header">
      <Search />
      <div className="header-wrapper">
        <FileUploader />
        <SignOutButton>
          <Button
            type="button"
            className="sign-out-button"
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
