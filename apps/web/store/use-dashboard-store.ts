"use client";

import { create } from "zustand";
import axios from "axios";

export type RunStatus = 
    | "UPLOADED"
    | "EXTRACTING"
    | "VALIDATING"
    | "COMPLETED"
    | "NEEDS_REVIEW"
    | "FAILED";

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
    metadata : unknown,
    createdAt : string,
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

type DashboardStore = {
    runs : ExtractionRunRecord[],
    reviewRuns : ExtractionRunRecord[],
    selectedRun : ExtractionRunRecord | null,

    isFetchingRuns : boolean,
    isFetchingReviewRuns : boolean,
    isFetchingRun : boolean,
    isUploadingPdf : boolean,
    isSubmittingEmail : boolean,

    isExtractingRun : boolean,
    isValidatingRun : boolean,


    error : string | null,
    successMessage : string | null,

    fetchRuns : () => Promise<void>;
    fetchReviewRuns : () => Promise<void>;
    fetchRun : (runId : string) => Promise<void>;
    uploadPdf : (file : File) => Promise<void>;
    submitEmailText : (contentText : string) => Promise<void>;
    clearMessages : () => void;
    
    extractRun : (runId : string) => Promise<void>;
    validateRun : (runId : string) => Promise<void>;
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
    reviewRuns : [],
    selectedRun : null,

    isFetchingRuns: false,
    isFetchingReviewRuns : false,
    isFetchingRun: false,
    isUploadingPdf: false,
    isSubmittingEmail: false,

    isExtractingRun : false,
    isValidatingRun : false,

    

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
            await get().fetchReviewRuns();
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to validate run."),
                isValidatingRun : false,
            })

            await get().fetchRun(runId);
        }
    },

    fetchReviewRuns : async () => {
        set({
            isFetchingReviewRuns : true,
            error : null,
        })
        try{
            const res = await axios.get<RunsResponse>("/api/review-queue");

            set({
                reviewRuns : res.data.runs,
                isFetchingReviewRuns : false,
            })
        }catch(error){
            set({
                error : getErrorMessage(error,"Failed to fetch review queue"),
                isFetchingReviewRuns : false,
            })
        }
    }
}));