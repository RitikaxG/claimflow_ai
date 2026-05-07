import Link from "next/link";
import { ReviewQueueList } from "../../components/review/review-queue-list";

export default function ReviewQueuePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Week 2 Foundation · Human Review Queue
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Review Queue
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Runs with missing fields, conflicts, low confidence, or required
              evidence appear here for human review.
            </p>
          </div>

          <nav className="flex gap-3 text-sm">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Dashboard
            </Link>

            <Link
              href="/review"
              className="rounded-lg bg-gray-950 px-4 py-2 font-medium text-white shadow-sm"
            >
              Review Queue
            </Link>
          </nav>
        </header>

        <ReviewQueueList />
      </div>
    </main>
  );
}