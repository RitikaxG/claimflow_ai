# ClaimFlow AI Sample Data

This folder contains public and synthetic sample data used to test ClaimFlow AI.

## Dataset structure

- `source-docs/public`: small public sample documents used for reference/demo testing
- `source-docs/synthetic`: fake claim documents created for repeatable local tests
- `expected-extractions`: expected JSON matching `ClaimExtractionSchema`
- `expected-validations`: expected validation output matching `ClaimValidationResultSchema`
- `field-matrix.md`: explains why the schema fields exist

## Current domain

Auto insurance claim intake.

## Why synthetic data exists

Synthetic data gives us stable, safe examples without exposing real customer information.

## Safety

Do not commit private customer data, real insurance documents, API keys, or large raw datasets.