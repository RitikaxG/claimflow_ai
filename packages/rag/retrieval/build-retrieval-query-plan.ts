import type { RetrievalQueryPlanItem } from "./retrieval-types";

export type BuildRetrievalQueryPlanInput = {
    question : string;
    claimContext? : unknown;
}

function normalizeText(value : string){
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function stringifyClaimContext(claimContext : unknown){
    if(!claimContext) return "";

    if(typeof claimContext === "string"){
        return claimContext;
    }

    try{
        return JSON.stringify(claimContext);
    }catch{
        return "";
    }
}

function includesAny(text : string, keywords : string[]){
    return keywords.some((keyword) => text.includes(keyword));
}

function addQuery(
    plan : RetrievalQueryPlanItem[],
    item : RetrievalQueryPlanItem,
){
    const alreadyExists = plan.some((existing) => 
        existing.intent === item.intent &&
        normalizeText(existing.query) === normalizeText(item.query)
    )

    if(!alreadyExists){
        plan.push(item);
    }
}

function addExclusionQuery(
    plan : RetrievalQueryPlanItem[],
    query : string,
    topK = 4,
){
    addQuery(plan,{
        intent : "exclusion",
        query,
        topK,
    });
}

export function buildRetrievalQueryPlan({
    question,
    claimContext,
}: BuildRetrievalQueryPlanInput) : RetrievalQueryPlanItem[]{
    const questionText = normalizeText(question);
    const claimContextText = normalizeText(stringifyClaimContext(claimContext));
    const combinedText = `${questionText} ${claimContextText}`;

    const plan : RetrievalQueryPlanItem[] = [];

    addQuery(plan,{
        intent : "general",
        query : question,
        topK : 4,
    });

    const mentionsTheft = includesAny(combinedText,[
        "theft",
        "stolen",
        "steal",
        "fir",
        "police report",
        "police"
    ]);

    // query : text we send to embedding model so it can find semantically similar policy chunks.
    if(mentionsTheft){
        addQuery(plan,{
            intent : "evidence",
            query : "theft claim FIR police report required evidence approval police station vehicle registration",
            topK : 3,
        });

        addQuery(plan,{
            intent : "coverage",
            query : "theft stolen vehicle coverage insured private vehicle reported to police auto policy",
            topK : 3,
        });
    }

    const mentionsThirdParty = includesAny(combinedText,[
        "third party",
        "third-party",
        "thirdparty",
        "liability",
        "bodily injury",
        "property damage",
        "tp claim"
    ]);

    if(mentionsThirdParty){
        addQuery(plan,{
            intent : "evidence",
            query : "third party claim police report required evidence third party details damage injury incident location",
            topK : 3,
        });

        addQuery(plan,{
            intent : "coverage",
            query : "third party liability coverage bodily injury death property damage insured vehicle auto policy",
            topK : 3,
        });
    }

    const mentionsOwnDamage = includesAny(combinedText,[
        "own damage",
        "accident",
        "collision",
        "overturning",
        "fire",
        "external impact",
        "damage photos",
        "repair estimate",
        "repair cost",
        "od claim",
    ]);

    if(mentionsOwnDamage){
        addQuery(plan, {
            intent : "coverage",
            query : "own damage coverage accidental physical damage collision overturning fire external impact insured vehicle",
            topK : 3,
        });

        addQuery(plan, {
            intent : "evidence",
            query : "own damage claim required evidence damage photos inspection evidence repair estimate vehicle registration claim form",
            topK : 3,
        });
    }

    const mentionsFlood = includesAny(combinedText,[
        "flood",
        "waterlogging",
        "water logging",
        "storm",
        "rain",
        "water damage",
    ]);

    if(mentionsFlood){
        addQuery(plan,{
            intent : "coverage",
            query : "own damage coverage flood storm water damage insured private vehicle auto policy",
            topK : 3,
        });

        addQuery(plan,{
            intent : "evidence",
            query : "flood damage claim required evidence waterlogging incident location incident date damage photos inspection evidence",
            topK : 3,
        });
    }

    const mentionsRepairLimit = includesAny(combinedText,[
        "repair estimate",
        "approval limit",
        "limit",
        "above 75000",
        "75,000",
        "75000",
        "inr 75000",
        "insurer review",
        "repair approval",
    ]);

    if(mentionsRepairLimit){
        addQuery(plan,{
            intent: "limit",
            query : "repair estimate approval limit INR 75000 insurer review final approval repair estimate alone not sufficient",
            topK : 3,
        });
    }

    const mentionsInvalidLicense = includesAny(combinedText,[
        "invalid license",
        "license",
        "licence",
        "driving license",
        "driving licence",
        "no license",
        "without license",
    ]);

    if(mentionsInvalidLicense){
        addExclusionQuery(
            plan,
            "invalid driving license exclusion claim not covered driver did not hold valid driving license",
            3,
        );
    }

    const mentionsIntoxication = includesAny(combinedText, [
        "alcohol",
        "drunk",
        "intoxication",
        "intoxicated",
        "drugs",
        "under influence",
    ]);

    if(mentionsIntoxication){
        addExclusionQuery(
            plan,
            "intoxication exclusion alcohol drugs under influence claim not covered",
            3,
        );
    }

    const mentionsCommercialUse = includesAny(combinedText,[
        "commercial use",
        "delivery",
        "paid passenger",
        "rental",
        "taxi",
        "commercial purpose",
    ]);

    if(mentionsCommercialUse){
        addExclusionQuery(
            plan,
            "commercial use exclusion private vehicle commercial delivery paid passenger transport rental service claim not covered",
            3,
        );
    }

    const mentionsWearAndTear = includesAny(combinedText,[
        "wear and tear",
        "wear",
        "tear",
        "gradual deterioration",
        "depreciation",
        "mechanical breakdown",
        "lack of maintenance",
        "maintenance"
    ]);

    if(mentionsWearAndTear){
        addExclusionQuery(
            plan,
            "wear and tear exclusion gradual deterioration depreciation mechanical breakdown lack of maintenance claim not covered",
            3,
        );
    }

    const asksAboutExplicitExclusion = includesAny(combinedText, [
        "not covered",
        "excluded",
        "exclusion",
        "reject",
        "rejected",
        "deny",
        "denied",
    ]);

    if(asksAboutExplicitExclusion){
        addExclusionQuery(
            plan,
            "claim exclusions not covered invalid license intoxication commercial use wear and tear mechanical breakdown",
            4,
        )
    }

    return plan;
}