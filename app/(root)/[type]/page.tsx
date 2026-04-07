import React from "react";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { Models } from "node-appwrite";
import Card from "@/components/Card";
import { convertFileSize, getFileTypesParams } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || "";
  const searchText = ((await searchParams)?.query as string) || "";
  const sort = ((await searchParams)?.sort as string) || "";
  const cursor = ((await searchParams)?.cursor as string) || "";

  const types = getFileTypesParams(type) as FileType[];

  const files = await getFiles({
    types,
    searchText,
    sort,
    cursor: cursor || undefined,
    limit: 24,
  });
  const totalSize = files.documents.reduce(
    (sum: number, file: Models.Document) => sum + (Number(file.size) || 0),
    0,
  );

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">{type}</h1>

        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">{convertFileSize(totalSize)}</span>
          </p>

          <div className="sort-container">
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>

            <Sort />
          </div>
        </div>
      </section>

      {/* Render the files */}
      {files.total > 0 ? (
        <>
          <section className="file-list">
            {files.documents.map((file: Models.Document) => (
              <Card key={file.$id} file={file} />
            ))}
          </section>

          {files.nextCursor && (
            <div className="mt-2 w-full text-center">
              <Link
                href={`/${type}?query=${encodeURIComponent(searchText)}&sort=${encodeURIComponent(sort)}&cursor=${encodeURIComponent(files.nextCursor)}`}
                className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-white transition hover:bg-brand-100"
              >
                Load more
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};

export default Page;
