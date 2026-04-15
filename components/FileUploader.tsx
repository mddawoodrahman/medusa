"use client";

import React, { useCallback, useState } from "react";

import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, convertFileToUrl, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "@/components/Thumbnail";
import { MAX_FILE_SIZE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { createFileMetadata } from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Account, Client, Storage } from "appwrite";

interface Props {
  className?: string;
}

type UploadInitiationResponse = {
  upload: {
    endpoint: string;
    projectId: string;
    bucketId: string;
    fileId: string;
    permissions: string[];
    maxFileSizeBytes: number;
  };
  token: {
    userId: string;
    secret: string;
    expire: string;
  };
};

const resolveUploadErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.trim().length > 0
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};

const FileUploader = ({ className }: Props) => {
  const path = usePathname();
  const { userId } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const uploadDirectlyToAppwrite = useCallback(
    async (file: File) => {
      const initiateResponse = await fetch("/api/upload/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          size: file.size,
          mimeType: file.type || undefined,
        }),
      });

      if (!initiateResponse.ok) {
        const failureBody = await initiateResponse
          .json()
          .catch(() => ({ error: "Failed to initiate upload" }));

        const baseMessage =
          typeof failureBody?.error === "string" && failureBody.error.length > 0
            ? failureBody.error
            : "Failed to initiate upload";

        const requestId =
          typeof failureBody?.requestId === "string" &&
          failureBody.requestId.trim().length > 0
            ? failureBody.requestId.trim()
            : null;

        const message = requestId
          ? `${baseMessage} (request id: ${requestId})`
          : baseMessage;

        throw new Error(message);
      }

      const initiation =
        (await initiateResponse.json()) as UploadInitiationResponse;

      const client = new Client()
        .setEndpoint(initiation.upload.endpoint)
        .setProject(initiation.upload.projectId);

      const account = new Account(client);
      const storage = new Storage(client);

      await account.createSession(
        initiation.token.userId,
        initiation.token.secret,
      );

      try {
        const uploaded = await storage.createFile(
          initiation.upload.bucketId,
          initiation.upload.fileId,
          file,
          initiation.upload.permissions,
        );

        await createFileMetadata({
          bucketFileId: uploaded.$id,
          fileName: uploaded.name,
          size: uploaded.sizeOriginal,
          path,
        });
      } finally {
        try {
          await account.deleteSession("current");
        } catch (cleanupError) {
          console.warn("Upload session cleanup failed", cleanupError);
        }
      }
    },
    [path],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!userId) {
        toast({
          description: (
            <p className="body-2 text-white">You must be signed in to upload files.</p>
          ),
          className: "error-toast",
        });

        return;
      }

      setFiles(acceptedFiles);

      // Process uploads sequentially to avoid session churn races across parallel files.
      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setFiles((prevFiles) =>
            prevFiles.filter((f) => f.name !== file.name),
          );

          toast({
            description: (
              <p className="body-2 text-white">
                <span className="font-semibold">{file.name}</span> is too large.
                Max file size is 50MB.
              </p>
            ),
            className: "error-toast",
          });

          continue;
        }

        try {
          await uploadDirectlyToAppwrite(file);

          setFiles((prevFiles) =>
            prevFiles.filter((f) => f.name !== file.name),
          );
        } catch (error) {
          const resolvedMessage = resolveUploadErrorMessage(
            error,
            `Failed to upload ${file.name}.`,
          );

          toast({
            description: (
              <p className="body-2 text-white">
                <span className="font-semibold">{file.name}</span>: {resolvedMessage}
              </p>
            ),
            className: "error-toast",
          });

          setFiles((prevFiles) =>
            prevFiles.filter((f) => f.name !== file.name),
          );
        }
      }
    },
    [toast, uploadDirectlyToAppwrite, userId],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>,
    fileName: string,
  ) => {
    e.stopPropagation();
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "uploader-dropzone",
        isDragActive && "uploader-dropzone-active",
      )}
    >
      <input {...getInputProps()} />
      <Button
        type="button"
        className={cn("uploader-button", className)}
        onClick={open}
      >
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />{" "}
        <p>Upload</p>
      </Button>
      <p className="uploader-dropzone-hint">
        {isDragActive ? "Drop files to upload" : "Drag and drop files here"}
      </p>
      {files.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100">Uploading</h4>

          {files.map((file, index) => {
            const { type, extension } = getFileType(file.name);

            return (
              <li
                key={`${file.name}-${index}`}
                className="uploader-preview-item"
              >
                <div className="flex items-center gap-3">
                  <Thumbnail
                    type={type}
                    extension={extension}
                    url={convertFileToUrl(file)}
                  />

                  <div className="preview-item-name">
                    {file.name}
                    <Image
                      src="/assets/icons/file-loader.gif"
                      width={80}
                      height={26}
                      alt="Loader"
                      unoptimized
                    />
                  </div>
                </div>

                <Image
                  src="/assets/icons/remove.svg"
                  width={24}
                  height={24}
                  alt="Remove"
                  className="dark:invert"
                  onClick={(e) => handleRemoveFile(e, file.name)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
