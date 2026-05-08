"use client";

import type { DocumentRecord } from "../../store/use-dashboard-store";

type SourceDocumentCardProps = {
  document: DocumentRecord;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SourceDocumentCard({ document }: SourceDocumentCardProps) {
  const isEmailText = document.sourceType === "EMAIL_TEXT";
  const isPdf = document.sourceType === "PDF";

  const copyEmailText = async () => {
    if (!document.contentText) {
      return;
    }

    await navigator.clipboard.writeText(document.contentText);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">
            Source document
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Original source content used for this extraction run.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
          {document.sourceType}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Filename</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {document.filename}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Size</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {formatBytes(document.sizeBytes)}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">MIME type</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {document.mimeType}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Deleted?</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {document.deletedAt ? "Yes" : "No"}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-gray-500">Content hash</dt>
          <dd className="mt-1 break-all font-mono text-xs text-gray-700">
            {document.contentHash ?? "Not available"}
          </dd>
        </div>

        {document.deletedReason ? (
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Deleted reason</dt>
            <dd className="mt-1 font-medium text-gray-950">
              {document.deletedReason}
            </dd>
          </div>
        ) : null}
      </dl>

      {isEmailText ? (
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-950">
              Original email text
            </h3>

            <button
              type="button"
              disabled={!document.contentText}
              onClick={() => void copyEmailText()}
              className="w-fit rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Copy email text
            </button>
          </div>

          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800">
            {document.contentText ?? "Email text is not available."}
          </pre>
        </div>
      ) : null}

      {isPdf ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          PDF source is stored locally during development using the document
          storage path. The extracted JSON and validation result are shown below.
        </div>
      ) : null}
    </section>
  );
}