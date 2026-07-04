import { DefaultExecutor } from "./default.js";

const NEWER_MODEL_REGEX = /gpt-5|o\d+(-|$)/i;

export class AzureExecutor extends DefaultExecutor {
  constructor() {
    super("azure");
  }

  buildUrl(model, stream, urlIndex = 0, credentials = null) {
    const azureEndpoint = credentials?.providerSpecificData?.azureEndpoint
      || process.env.AZURE_OPENAI_ENDPOINT
      || process.env.AZURE_ENDPOINT
      || "https://api.openai.com";

    const apiVersion = credentials?.providerSpecificData?.apiVersion
      || process.env.AZURE_OPENAI_API_VERSION
      || process.env.AZURE_API_VERSION
      || "2024-10-01-preview";

    let deployment = credentials?.providerSpecificData?.deployment
      || model
      || process.env.AZURE_OPENAI_DEPLOYMENT
      || process.env.AZURE_DEPLOYMENT
      || "gpt-4";

    // Ergonomic: strip provider prefix if model is used as deployment name (e.g. azure/gpt-4o -> gpt-4o)
    if (deployment && typeof deployment === "string") {
      deployment = deployment.split("/").pop();
    }

    const endpoint = azureEndpoint.replace(/\/$/, "");
    return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  }

  buildHeaders(credentials, stream = true) {
    const headers = {
      "Content-Type": "application/json",
      ...this.config.headers
    };

    const apiKey = credentials?.apiKey
      || credentials?.accessToken
      || process.env.AZURE_OPENAI_API_KEY
      || process.env.AZURE_API_KEY
      || process.env.OPENAI_API_KEY;

    if (apiKey) {
      headers["api-key"] = apiKey;
    }

    const organization = credentials?.providerSpecificData?.organization
      || process.env.AZURE_OPENAI_ORGANIZATION
      || process.env.AZURE_ORGANIZATION;

    if (organization) {
      headers["OpenAI-Organization"] = organization;
    }

    if (stream) {
      headers["Accept"] = "text/event-stream";
    }

    return headers;
  }

  requiresMaxCompletionTokens(model, credentials) {
    const deployment = credentials?.providerSpecificData?.deployment || "";
    const m = (model || "").toLowerCase();
    const d = deployment.toLowerCase();
    return NEWER_MODEL_REGEX.test(m) || NEWER_MODEL_REGEX.test(d);
  }

  transformRequest(model, body, stream, credentials) {
    const transformed = { ...super.transformRequest(model, body, stream, credentials) };
    const isNewModel = this.requiresMaxCompletionTokens(model, credentials);

    if (isNewModel) {
      if (transformed.max_tokens !== undefined) {
        transformed.max_completion_tokens = transformed.max_tokens;
        delete transformed.max_tokens;
      }
    } else {
      if (transformed.max_completion_tokens !== undefined) {
        transformed.max_tokens = transformed.max_completion_tokens;
        delete transformed.max_completion_tokens;
      }
    }
    return transformed;
  }
}
