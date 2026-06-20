import { ReviewTaskDetailScreen } from "../../../components/review/review-task-detail-screen";
import { ReviewProductCopyCleanup } from "../../../components/review/review-product-copy-cleanup";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
};

export default async function ReviewTaskDetailPage({ params } : Params){
    const { taskId } = await params;

    return (
        <div className="review-task-product-screen">
            <ReviewProductCopyCleanup />
            <ReviewTaskDetailScreen taskId={taskId} />
        </div>
    );
}
