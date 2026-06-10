"use client";

import { create } from "zustand";
import axios from "axios";

export type DocumentSourceType = "PDF" | "EMAIL_TEXT" | "IMAGE";

export type DocumentRecord = {
    id : string,
    filename : string,
    mimeType : string,
    sizeBytes : number,
    storagePath : string | null,
    contentText : string | null,
    sourceUrl : string | null,
    sourceType : DocumentSourceType,
    contentHash : string | null,
    deletedAt : string | null,
    deletedReason : string | null,
    createdAt : string,
    updatedAt : string,
};

export type ExtractionEventRecord = {
    id : string,
    runId : string,
    type : string,
    message : string,
    metadata : unknown | null,
    createdAt : string,
};

export type AgentActionLogRecord = {
    id : string,
    runId : string,
    action : string,
    status : string,
    rationale : string | null,
    guardrailDecision : string | null,
    blockedReason : string | null,
    toolName : string | null,
    toolInputJson : unknown | null,
    toolOutputJson : unknown | null,
    createdAt : string,
};

export type FollowupDraftRecord = {
  id: string;
  runId: string;

  requestType: FollowupRequestType;

  subject: string;
  body: string;

  requestedEvidence: unknown;
  requestedFields: unknown;
  fieldRequests: unknown;

  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewTaskSummaryRecord = {
    id : string,
    runId : string,
    status : ReviewTaskStatus,
    priority : ReviewPriority,
    reasonJson : unknown,
    assignedTo : string | null,
    startedAt : string | null,
    completedAt : string | null,
    createdAt : string,
    updatedAt : string,
};

export type ExtractionRunRecord = {
    id : string,
    documentId : string,
    status : RunStatus,

    model : string | null,
    promptVersion : string | null,
    schemaVersion : string,

    rawModelOutput : unknown | null,
    extractedJson : unknown | null,
    validationJson : unknown | null,
    missingFieldsJson : unknown | null,
    confidenceJson : unknown | null,

    errorMessage : string | null,
    createdAt : string,
    updatedAt : string,

    document : DocumentRecord,
    events : ExtractionEventRecord[],

    reviewTask? : ReviewTaskSummaryRecord | null,
    agentActionLogs? : AgentActionLogRecord[],
    followupDrafts? : FollowupDraftRecord[],
};

type UploadResponse = {
    duplicate? : boolean,
    restored? : boolean,
    message? : string,
    document : DocumentRecord,
    run : ExtractionRunRecord | null,
    event? : ExtractionEventRecord,
};

type RunsResponse = {
    runs : ExtractionRunRecord[],
};

type RunResponse = {
    run : ExtractionRunRecord,
};

type DeleteDocumentResponse = {
    document : DocumentRecord,
    affectedRunIds : string[],
    alreadyDeleted? : boolean,
    message? : string,
}

export type RunStatus = 
    | "UPLOADED"
    | "EXTRACTING"
    | "VALIDATING"
    | "COMPLETED"
    | "NEEDS_REVIEW"
    | "FAILED";

export type ReviewTaskStatus = 
    | "PENDING"
    | "IN_REVIEW"
    | "APPROVED"
    | "EDITED_AND_APPROVED"
    | "REJECTED"
    | "NEEDS_MORE_INFO";

export type ReviewPriority = "LOW" | "NORMAL" | "HIGH";

export type ReviewDecisionRecord = {
    id : string,
    taskId : string,
    decision : string,
    correctedJson : unknown | null,
    correctedValidationJson: unknown | null;
    notes : string | null,
    reviewerName : string | null,
    createdAt : string,
};

export type ReviewEventRecord = {
    id : string,
    taskId : string,
    type : string,
    message : string,
    metadata : unknown | null,
    createdAt : string,
};

export type ReviewTaskRecord = {
    id : string,
    runId : string,
    status : ReviewTaskStatus,
    priority : ReviewPriority,
    reasonJson : unknown,
    assignedTo : string | null,
    startedAt : string | null,
    completedAt : string | null,
    createdAt : string,
    updatedAt : string,

    run : ExtractionRunRecord,
    decisions : ReviewDecisionRecord[],
    events : ReviewEventRecord[],
};

type ReviewTasksResponse = {
    reviewTasks : ReviewTaskRecord[],
}

type ReviewTaskResponse = {
    reviewTask : ReviewTaskRecord,
}

type ReviewTaskAction = 
    | "start"
    | "approve"
    | "reject"
    | "request_more_info"
    | "edit_and_approve";

type ReviewActionInput = {
    reviewerName? : string,
    notes? : string,
}

type EditAndApproveInput = {
    correctedJson : unknown;
    reviewerName? : string,
    notes? : string,
}

type AdditionalEvidenceInput = {
    evidenceItems : {
        label : string,
        note? : string,
    }[],
}

type AdditionalInformationInput = {
  evidenceItems?: {
    label: string;
    note?: string;
  }[];
  fieldValues?: {
    field: string;
    label?: string;
    value: string;
    note?: string;
  }[];
};

export type FollowupRequestType =
  | "EVIDENCE_REQUEST"
  | "FIELD_CLARIFICATION"
  | "MIXED_INFO_REQUEST";

export type MemoryMatchSignalRecord = {
  type: string;
  value: string;
  points: number;
};

export type MemoryUpdateRecord = {
  id: string;
  updateType: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  confidenceDelta: number | null;
  note: string | null;
  metadata: unknown | null;
  createdAt: string;
};

export type RunMemoryAuditItemRecord = {
  memoryId: string;
  memoryHitId: string;

  kind: string;
  status: string;
  riskLevel: string;
  confidence: number;

  summary: string;
  safeUse: string;
  mustNotDo: string[];

  score: number;
  matchedOn: MemoryMatchSignalRecord[];
  retrievalReason: string | null;

  usedByAgent: boolean;
  agentActionLogId: string | null;
  agentAction: string | null;
  agentActionStatus: string | null;

  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;

  sourceRunId: string | null;
  sourceReviewDecisionId: string | null;
  sourceCoverageQuestionId: string | null;
  sourceAgentActionLogId: string | null;

  createdAt: string;
  retrievalCount: number;

  updates: MemoryUpdateRecord[];
};

export type RunMemoryAuditResponse = {
  runId: string;
  memories: RunMemoryAuditItemRecord[];
  summary: {
    totalHits: number;
    totalRetrievalEvents: number;
    usedByAgentCount: number;
    highRiskCount: number;
    latestRetrievedAt: string | null;
  };
};

type MemoryFeedbackInput = {
  memoryId: string;
  memoryHitId?: string;
  relevance: "CONFIRMED_RELEVANT" | "IRRELEVANT";
  note?: string;
};

type DashboardStore = {
    runs : ExtractionRunRecord[],

    reviewTasks : ReviewTaskRecord[],
    selectedReviewTask : ReviewTaskRecord | null,

    selectedRun : ExtractionRunRecord | null,

    isFetchingRuns : boolean,
    isFetchingRun : boolean,

    isFetchingReviewTasks : boolean,
    isFetchingReviewTask : boolean,
    
    isUploadingPdf : boolean,
    isSubmittingEmail : boolean,

    isExtractingRun : boolean,
    isValidatingRun : boolean,
    isRunningAgentStep : boolean,
    isSubmittingAdditionalInformation : boolean,
    isReopeningReviewTask : boolean,
    

    deletingDocumentId : string | null,

    error : string | null,
    successMessage : string | null,

    reviewTaskActionInFlight : ReviewTaskAction | null,

    runMemoriesByRunId: Record<string, RunMemoryAuditResponse>;
    isFetchingRunMemories: boolean;
    isRetrievingRunMemories: boolean;
    memoryFeedbackInFlightId: string | null;

    fetchRuns : () => Promise<void>;
    fetchRun : (runId : string) => Promise<void>;

    fetchReviewTasks : () => Promise<void>;
    fetchReviewTask : (taskId : string) => Promise<void>;

    startReviewTask : (taskId : string) => Promise<void>;
    approveReviewTask : (taskId : string, input? : ReviewActionInput) => Promise<void>;
    rejectReviewTask : (taskId : string, input : ReviewActionInput) => Promise<void>;
    requestMoreInfoReviewTask : (taskId : string, input : ReviewActionInput) => Promise<void>;
    editAndApproveReviewTask : (taskId : string, input : EditAndApproveInput) => Promise<void>;
    
    uploadPdf : (file : File) => Promise<void>;
    submitEmailText : (contentText : string) => Promise<void>;
    clearMessages : () => void;
    
    extractRun : (runId : string) => Promise<void>;
    validateRun : (runId : string) => Promise<void>;
    runAgentStep : (runId : string) => Promise<void>;
    submitAdditionalEvidence : (runId : string, input : AdditionalEvidenceInput) => Promise<void>;
    submitAdditionalInformation: (
        runId: string,
        input: AdditionalInformationInput,
    ) => Promise<boolean>;
    reopenReviewTask : (taskId : string) => Promise<boolean>;
    deleteDocument : (documentId : string, deletedReason? : string) => Promise<void>;

    fetchRunMemories: (runId: string) => Promise<void>;
    retrieveRunMemories: (runId: string) => Promise<void>;
    submitMemoryFeedback: (
    runId: string,
    input: MemoryFeedbackInput,
    ) => Promise<void>;
};

type ApiErrorResponse = {
  error?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
    runs : [],
    selectedRun : null,

    reviewTasks : [],
    selectedReviewTask : null,

    isFetchingRuns: false,
    isFetchingRun: false,
    reviewTaskActionInFlight : null,

    isFetchingReviewTasks : false,
    isFetchingReviewTask : false,

    isUploadingPdf: false,
    isSubmittingEmail: false,

    isExtractingRun : false,
    isValidatingRun : false,
    isRunningAgentStep : false,
    isSubmittingAdditionalInformation : false,
    isReopeningReviewTask : false,

    deletingDocumentId : null,

    runMemoriesByRunId: {},
    isFetchingRunMemories: false,
    isRetrievingRunMemories: false,
    memoryFeedbackInFlightId: null,

    error: null,
    successMessage: null,

    clearMessages : () => {
        set({ error : null, successMessage : null })
    },

    fetchRuns: async () => {
        set({ isFetchingRuns : true, error : null });

        try{
            const res = await axios.get<RunsResponse>("/api/extraction-runs");

            set({
                runs : res.data.runs,
                isFetchingRuns : false,
            });
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch recent runs."),
                isFetchingRuns : false,
            });
        }
    },

    fetchRun : async (runId : string) => {
        set({ isFetchingRun : true, error : null });

        try{
            const res = await axios.get<RunResponse>(
                `/api/extraction-runs/${runId}`
            );

            set({
                selectedRun : res.data.run,
                isFetchingRun : false,
            });
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch run."),
                isFetchingRun : false,
            });
        }
    },

    fetchRunMemories: async (runId: string) => {
    set({
        isFetchingRunMemories: true,
    });

    try {
        const res = await axios.get<RunMemoryAuditResponse>(
        `/api/extraction-runs/${runId}/memories`,
        );

        set((state) => ({
        runMemoriesByRunId: {
            ...state.runMemoriesByRunId,
            [runId]: res.data,
        },
        isFetchingRunMemories: false,
        }));
    } catch {
        set({
        isFetchingRunMemories: false,
        });
    }
    },
        retrieveRunMemories: async (runId: string) => {
        set({
            isRetrievingRunMemories: true,
            error: null,
            successMessage: null,
        });

        try {
            const res = await axios.post<{
                alreadyRetrieved?: boolean;
                audit: RunMemoryAuditResponse;
            }>(`/api/extraction-runs/${runId}/memories/retrieve`);

            set((state) => ({
            runMemoriesByRunId: {
                ...state.runMemoriesByRunId,
                [runId]: res.data.audit,
            },
            isRetrievingRunMemories: false,
            successMessage: res.data.alreadyRetrieved
                ? "Workflow memory was already retrieved for this run."
                : "Workflow memory retrieved for this run.",
            }));

            await get().fetchRun(runId);
        } catch (error) {
            set({
            error: getErrorMessage(error, "Failed to retrieve workflow memories."),
            isRetrievingRunMemories: false,
            });
        }
        },

        submitMemoryFeedback: async (runId: string, input: MemoryFeedbackInput) => {
        set({
            memoryFeedbackInFlightId: input.memoryId,
            error: null,
            successMessage: null,
        });

        try {
            const res = await axios.post<{
               audit: RunMemoryAuditResponse | null;
               }>(
               `/api/extraction-runs/${runId}/memories/${input.memoryId}/feedback`,
               {
                   memoryHitId: input.memoryHitId,
                   relevance: input.relevance,
                   note: input.note,
               },
            );

            set((state) => ({
            runMemoriesByRunId: res.data.audit
                ? {
                    ...state.runMemoriesByRunId,
                    [runId]: res.data.audit,
                }
                : state.runMemoriesByRunId,
            memoryFeedbackInFlightId: null,
            successMessage: "Memory feedback recorded.",
            }));

            await get().fetchRun(runId);
        } catch (error) {
            set({
            error: getErrorMessage(error, "Failed to record memory feedback."),
            memoryFeedbackInFlightId: null,
            });
        }
        },
    uploadPdf : async(file : File) => {
        set({ isUploadingPdf : true, error : null });

        try{
            const formData = new FormData();
            formData.append("sourceType","PDF");
            formData.append("file",file);

            const res = await axios.post<UploadResponse>("api/documents/upload",formData);

            set({
                isUploadingPdf : false,
                successMessage : res.data.message ?? "PDF uploaded. Extraction run created.",
            });

            await get().fetchRuns();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to upload PDF."),
                isUploadingPdf : false,
            });
        }
    },

    submitEmailText : async (contentText : string) => {
        set({ isSubmittingEmail : true, error : null });

        try{
            const formData = new FormData();
            formData.append("sourceType","EMAIL_TEXT");
            formData.append("contentText", contentText);

            const res = await axios.post<UploadResponse>("api/documents/upload",formData);

            set({
                isSubmittingEmail : false,
                successMessage : res.data.message ?? "Email text submitted. Extraction run created."
            });

            await get().fetchRuns();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to submit email text."),
                isSubmittingEmail : false,
            });
        }
    },

    extractRun : async(runId : string) => {
        set({
            isExtractingRun : true,
            error : null,
            successMessage : null,
        });

        try{
            await axios.post(`/api/extraction-runs/${runId}/extract`);

            set({
                isExtractingRun : false,
                successMessage : "Extraction Completed. Structured JSON saved.",
            })

            await get().fetchRun(runId);
            await get().fetchRuns();
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to run extraction."),
                isExtractingRun : false,
            });

            await get().fetchRun(runId);
        }
    },

    validateRun : async(runId : string) => {
        set({
            isValidatingRun : true,
            error : null,
            successMessage : null,
        })

        try{
            await axios.post(`/api/extraction-runs/${runId}/validate`);

            set({
                isValidatingRun: false,
                successMessage : "Validation completed."
            });

            await get().fetchRun(runId);
            await get().fetchRuns();
            await get().fetchReviewTasks();
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to validate run."),
                isValidatingRun : false,
            })

            await get().fetchRun(runId);
        }
    },

    fetchReviewTasks : async () => {
        set({
            isFetchingReviewTasks : true,
            error : null,
        })
        try{
            const res = await axios.get<ReviewTasksResponse>("/api/review-tasks");

            set({
                reviewTasks : res.data.reviewTasks,
                isFetchingReviewTasks : false,
            })
        }catch(error){
            set({
                error : getErrorMessage(error,"Failed to fetch review tasks"),
                isFetchingReviewTasks : false,
            })
        }
    },

    fetchReviewTask : async ( taskId : string ) => {
        set({
            isFetchingReviewTask : true,
            error : null,
        })

        try{
            const res = await axios.get<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}`
            );

            set({
                selectedReviewTask : res.data.reviewTask,
                isFetchingReviewTask : false
            })
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch review task."),
                isFetchingReviewTask : false
            })
        }
    },

    deleteDocument : async (
        documentId : string,
        deletedReason = "Document no longer required.",
    ) => {
        set({
            deletingDocumentId : documentId,
            error : null,
            successMessage : null,
        });

        try{
            const res = await axios.delete<DeleteDocumentResponse>(
                `/api/documents/${documentId}`,
                {
                    data : {
                        deletedReason
                    },
                },
            );

            set({
                deletingDocumentId: null,
                successMessage : res.data.message ?? "Document soft deleted successfully."
            });

            await get().fetchRuns();
            await get().fetchReviewTasks();

            const selectedRun = get().selectedRun;
            if(selectedRun?.document.id === documentId){
                await get().fetchRun(selectedRun.id);
            }
        }catch(error){
            set({
                deletingDocumentId : null,
                error : getErrorMessage(error,"Failed to delete document."),
            })
        }
    },
    startReviewTask : async (taskId : string) => {
        set({
            reviewTaskActionInFlight : "start",
            error : null,
            successMessage : null,
        })

        try{
            const res = await axios.post<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}/start`
            );

            set({
                selectedReviewTask : res.data.reviewTask,
                reviewTaskActionInFlight : null,
                successMessage : "Review task started.",
            })

            await get().fetchReviewTasks();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to start review task."),
                reviewTaskActionInFlight: null,
            })
        }
    },

    approveReviewTask : async (
        taskId : string, 
        input : ReviewActionInput = {}
    ) => {
        set({
            reviewTaskActionInFlight : "approve",
            error : null,
            successMessage : null,
        })

        try{
            const res = await axios.post<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}/approve`,
                input,
            );

            set({
                selectedReviewTask : res.data.reviewTask,
                reviewTaskActionInFlight : null,
                successMessage : "Review task approved.",
            })

            await get().fetchReviewTasks();
            await get().fetchRunMemories(res.data.reviewTask.run.id);
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to approve review task."),
                reviewTaskActionInFlight: null,
            })
        }
    },

    rejectReviewTask: async(
        taskId : string, 
        input : ReviewActionInput
    ) => {
        set({
            reviewTaskActionInFlight : "reject",
            error : null,
            successMessage : null,
        })

        try{
            const res = await axios.post<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}/reject`,
                input,
            )

            set({
                selectedReviewTask : res.data.reviewTask,
                reviewTaskActionInFlight : null,
                successMessage : "Review task rejected.",
            })

            await get().fetchReviewTasks();
            await get().fetchRunMemories(res.data.reviewTask.run.id);
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to reject review task."),
                reviewTaskActionInFlight: null,
            });
        }
    },

    requestMoreInfoReviewTask : async (
        taskId : string,
        input : ReviewActionInput,
    ) => {
        set({
            reviewTaskActionInFlight : "request_more_info",
            error : null,
            successMessage : null,
        });

        try{
            const res = await axios.post<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}/request-more-info`,
                input,
            );

            set({
                selectedReviewTask : res.data.reviewTask,
                reviewTaskActionInFlight : null,
                successMessage : "Requested more information for review task.",
            })

            await get().fetchReviewTasks();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to request more information for review task."),
                reviewTaskActionInFlight: null,
            });
        }
    },
    editAndApproveReviewTask : async(
        taskId : string,
        input : EditAndApproveInput,
    ) => {
        set({
            reviewTaskActionInFlight : "edit_and_approve",
            error : null,
            successMessage : null,
        });

        try{
            const res = await axios.post<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}/edit-and-approve`,
                input,
            )

            set({
                selectedReviewTask : res.data.reviewTask,
                reviewTaskActionInFlight : null,
                successMessage : "Corrected JSON approved.",
            });

            await get().fetchReviewTasks();
            await get().fetchRunMemories(res.data.reviewTask.run.id);
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to edit and approve review task."),
                reviewTaskActionInFlight : null,
            })
        }
    },

    runAgentStep: async(runId : string) => {
        set({
            isRunningAgentStep : true,
            error : null,
            successMessage : null,
        });

        try{
            await axios.post(`/api/extraction-runs/${runId}/agent-step`);

            set({
                isRunningAgentStep : false,
                successMessage : "Agent step completed.",
            })

            await get().fetchRun(runId);
            await get().fetchRuns();
            await get().fetchReviewTasks();
            await get().fetchRunMemories(runId);
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to run agent step."),
                isRunningAgentStep : false,
            });

            await get().fetchRun(runId);
        }
    },
    submitAdditionalEvidence : async(runId : string, input : AdditionalEvidenceInput) => {
        set({
            isSubmittingAdditionalInformation : true,
            error : null,
            successMessage : null,
        });

        try{
            await axios.post(
                `/api/extraction-runs/${runId}/additional-evidence`,
                input,
            );

            set({
                isSubmittingAdditionalInformation : false,
                successMessage : "Additional evidence recorded.",
            });

            await get().fetchRun(runId);
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to record additional evidence."),
                isSubmittingAdditionalInformation : false,
            });
        }
    },

    reopenReviewTask : async(taskId : string) => {
        set({
            isReopeningReviewTask : true,
            error : null,
            successMessage : null,
        });

        try{
            await axios.post(`/api/review-tasks/${taskId}/reopen`);

            set({
                isReopeningReviewTask : false,
                successMessage : "Review reopened to PENDING. Start review again to continue human verification.",
            });

            await get().fetchReviewTask(taskId);
            await get().fetchReviewTasks();

            return true;
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to reopen review task."),
                isReopeningReviewTask : false,
            });

            return false;
        }
    },
    submitAdditionalInformation: async (
        runId: string,
        input: AdditionalInformationInput,
        ) => {
        set({
            isSubmittingAdditionalInformation: true,
            error: null,
            successMessage: null,
        });

        try {
            await axios.post(
            `/api/extraction-runs/${runId}/additional-information`,
            input,
            );

            set({
            isSubmittingAdditionalInformation: false,
            successMessage: "Additional information recorded.",
            });

            await get().fetchRun(runId);

            return true;
        } catch (error) {
            set({
            error: getErrorMessage(error, "Failed to record additional information."),
            isSubmittingAdditionalInformation: false,
            });

            return false;
        }
    },
}));