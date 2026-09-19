import type { FastifyRequest } from "fastify";
import { ClientFacingError } from "../errors/api-error";

const requireAuthenticatedUserId = (request: FastifyRequest): string => {
	if (request.user === null) {
		throw new ClientFacingError({
			statusCode: 401,
			code: "AUTHENTICATION_REQUIRED",
			message: "Sign in to access this resource."
		});
	}

	return request.user.id;
};

export { requireAuthenticatedUserId };
