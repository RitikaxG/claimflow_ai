import { ReviewTaskDetailScreen } from "../../../components/review/review-task-detail-screen";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
};

export default async function ReviewTaskDetailPage({ params } : Params){
    const { taskId } = await params;

    return (
        <div className="review-task-product-screen">
            <ReviewTaskDetailScreen taskId={taskId} />
        </div>
    );
}
