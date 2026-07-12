export const INGESTION_FAILURE_CODE = "INGESTION_FAILED";
export const INGESTION_FAILURE_MESSAGE = "Rulebook processing failed";

export const sanitizedIngestionFailure = () => ({
  failureCode: INGESTION_FAILURE_CODE,
  failureMessage: INGESTION_FAILURE_MESSAGE,
});
