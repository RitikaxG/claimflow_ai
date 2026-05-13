

type Params = {
  params: Promise<{
    taskId: string;
  }>;
};

export default async function ReviewTaskDetailPage({ params }: Params) {
  const { taskId } = await params;

  return <ReviewTaskDetailScreen taskId={taskId} />;
}