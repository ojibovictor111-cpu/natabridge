import type { FastifyReply, FastifyRequest } from "fastify";

type ErrorLike = {
     code?: unknown;
     constraint?: unknown;
     message?: unknown;
     statusCode?: unknown;
     validation?: unknown;
};

type UniqueConstraintResponse = {
     code: string;
     field: string;
     message: string;
};

type ClientFacingErrorOptions = {
     statusCode: number;
     code: string;
     message: string;
     field?: string;
     cause?: unknown;
};

type ApiErrorResponse = {
     statusCode: number;
     code: string;
     message: string;
     requestId?: string;
     field?: string;
};

const uniqueConstraintResponses = new Map<string, UniqueConstraintResponse>([
     ["mothers_email_case_insensitive_unique", {
          code: "PATIENT_EMAIL_ALREADY_EXISTS",
          field: "email",
          message: "A patient with this email address already exists."
     }],
     ["mothers_phone_unique", {
          code: "PATIENT_PHONE_ALREADY_EXISTS",
          field: "phone",
          message: "A patient with this phone number already exists."
     }]
]);

class ClientFacingError extends Error {
     readonly statusCode: number;
     readonly code: string;
     readonly field?: string;

     constructor(options: ClientFacingErrorOptions) {
          super(
               options.message,
               options.cause === undefined ? {} : { cause: options.cause }
          );
          this.name = "ClientFacingError";
          this.statusCode = options.statusCode;
          this.code = options.code;

          if (options.field !== undefined) {
               this.field = options.field;
          }
     }
}

const isErrorLike = (error: unknown): error is ErrorLike =>
     typeof error === "object" && error !== null;

const withRequestId = (
     response: Omit<ApiErrorResponse, "requestId">,
     requestId?: string
): ApiErrorResponse => {
     if (requestId === undefined) return response;

     return {
          ...response,
          requestId
     };
};

const createApiErrorResponse = (
     error: unknown,
     requestId?: string
): ApiErrorResponse => {
     if (error instanceof ClientFacingError) {
          return withRequestId({
               statusCode: error.statusCode,
               code: error.code,
               message: error.message,
               ...(error.field === undefined ? {} : { field: error.field })
          }, requestId);
     }

     if (isErrorLike(error) && error.code === "23505") {
          const constraint = typeof error.constraint === "string"
               ? uniqueConstraintResponses.get(error.constraint)
               : undefined;

          if (constraint !== undefined) {
               return withRequestId({
                    statusCode: 409,
                    ...constraint
               }, requestId);
          }

          return withRequestId({
               statusCode: 409,
               code: "RESOURCE_ALREADY_EXISTS",
               message: "A record with the provided details already exists."
          }, requestId);
     }

     if (
          isErrorLike(error)
          && typeof error.statusCode === "number"
          && error.statusCode >= 400
          && error.statusCode < 500
     ) {
          const isFastifyValidationError = error.code === "FST_ERR_VALIDATION"
               && Array.isArray(error.validation);

          return withRequestId({
               statusCode: error.statusCode,
               code: isFastifyValidationError ? "VALIDATION_ERROR" : "REQUEST_ERROR",
               message: isFastifyValidationError
                    && typeof error.message === "string"
                    && error.message.length > 0
                    ? error.message
                    : "The request could not be completed."
          }, requestId);
     }

     return withRequestId({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while processing the request. Please try again."
     }, requestId);
};

const apiErrorHandler = (
     error: unknown,
     request: FastifyRequest,
     reply: FastifyReply
) => {
     const response = createApiErrorResponse(error, request.id);
     const logContext = {
          err: error,
          apiErrorCode: response.code
     };

     if (response.statusCode >= 500) {
          request.log.error(logContext, response.message);
     } else {
          request.log.warn(logContext, response.message);
     }

     return reply.code(response.statusCode).send(response);
};

export {
     apiErrorHandler,
     ClientFacingError,
     createApiErrorResponse
};

export type {
     ApiErrorResponse
};
