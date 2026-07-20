import { HumanDecisionExperience } from "../../../components/review/human-decision-experience";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
};

export default async function ReviewTaskDetailPage({ params } : Params){
    const { taskId } = await params;

    return <HumanDecisionExperience taskId={taskId} />;
}
