import { QualityReportScreen } from "../../../components/evals/quality-report-screen";

type Params = { params: Promise<{ evalRunId: string }> };

export default async function EvalRunPage({ params }: Params) {
  const { evalRunId } = await params;
  return <QualityReportScreen evalRunId={evalRunId} />;
}
