export const ERROR_CODES = {
  INVALID_JSON: "API_INVALID_JSON",
  INVALID_STATE: "API_INVALID_STATE",
  NOT_FOUND: "API_NOT_FOUND",
  METHOD_NOT_ALLOWED: "API_METHOD_NOT_ALLOWED",
  ADMIN_UNAUTHORIZED: "API_ADMIN_UNAUTHORIZED",
  PAYLOAD_TOO_LARGE: "API_PAYLOAD_TOO_LARGE",
  INTERNAL: "API_INTERNAL_ERROR",
  CONFLICT: "API_CONFLICT",
};

export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function success(data, requestId) {
  return { ok: true, data, meta: { requestId } };
}

export function failure(error, requestId) {
  return { ok: false, error: { code: error.code ?? ERROR_CODES.INTERNAL, message: error.message ?? "服务暂时不可用", details: error.details }, meta: { requestId } };
}
