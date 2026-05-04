import type { DocumentRecord } from "../../store/use-dashboard-store";
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DocumentMetadataCardProps = {
  document: DocumentRecord;
};

export function DocumentMetadataCard({ document }: DocumentMetadataCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Document metadata</h2>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Filename</dt>
          <dd className="mt-1 font-medium text-gray-950">{document.filename}</dd>
        </div>

        <div>
          <dt className="text-gray-500">Source type</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {document.sourceType}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">MIME type</dt>
          <dd className="mt-1 font-medium text-gray-950">{document.mimeType}</dd>
        </div>

        <div>
          <dt className="text-gray-500">Size</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {formatBytes(document.sizeBytes)}
          </dd>
        </div>
      </dl>

      {document.contentText ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Text preview
          </p>
          <p className="mt-2 line-clamp-4 text-sm text-gray-700">
            {document.contentText}
          </p>
        </div>
      ) : null}
    </section>
  );
}