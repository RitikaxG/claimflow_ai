import { Suspense } from "react";
import { OperationsExperience } from "../../components/evals/operations-experience";

export default function EvalsPage() {
  return (
    <Suspense fallback={<OperationsLoadingState />}>
      <OperationsExperience />
    </Suspense>
  );
}

function OperationsLoadingState() {
  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <div className="mx-auto max-w-6xl px-5 py-12 text-sm text-[#667571]">
        Loading operations…
      </div>
    </main>
  );
}
