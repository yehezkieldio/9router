import { describe, it, expect } from "vitest";
import { AzureExecutor } from "../../open-sse/executors/azure.js";

describe("AzureExecutor.transformRequest", () => {
  it("leaves max_tokens unchanged for older models", () => {
    const executor = new AzureExecutor();
    const body = { max_tokens: 100, messages: [] };
    const result = executor.transformRequest("gpt-4", body, false, null);
    expect(result.max_tokens).toBe(100);
    expect(result.max_completion_tokens).toBeUndefined();
  });

  it("converts max_tokens to max_completion_tokens for newer models (gpt-5)", () => {
    const executor = new AzureExecutor();
    const body = { max_tokens: 100, messages: [] };
    const result = executor.transformRequest("azure/gpt-5-4-mini", body, false, null);
    expect(result.max_tokens).toBeUndefined();
    expect(result.max_completion_tokens).toBe(100);
  });

  it("converts max_tokens to max_completion_tokens for o1-mini based on deployment name", () => {
    const executor = new AzureExecutor();
    const body = { max_tokens: 150, messages: [] };
    const credentials = {
      providerSpecificData: {
        deployment: "o1-mini-deploy"
      }
    };
    const result = executor.transformRequest("custom-model", body, false, credentials);
    expect(result.max_tokens).toBeUndefined();
    expect(result.max_completion_tokens).toBe(150);
  });

  it("converts max_completion_tokens back to max_tokens for older models", () => {
    const executor = new AzureExecutor();
    const body = { max_completion_tokens: 200, messages: [] };
    const result = executor.transformRequest("gpt-4", body, false, null);
    expect(result.max_completion_tokens).toBeUndefined();
    expect(result.max_tokens).toBe(200);
  });
});

describe("AzureExecutor.buildUrl deployment prefix stripping", () => {
  it("strips provider prefix if model is used as deployment name", () => {
    const executor = new AzureExecutor();
    const url = executor.buildUrl("azure/gpt-4o", false, 0, null);
    expect(url).toContain("/deployments/gpt-4o/");
  });

  it("does not strip custom deployment name containing azure in providerSpecificData", () => {
    const executor = new AzureExecutor();
    const credentials = {
      providerSpecificData: {
        deployment: "my-azure-deployment"
      }
    };
    const url = executor.buildUrl("azure/gpt-4o", false, 0, credentials);
    expect(url).toContain("/deployments/my-azure-deployment/");
  });
});
