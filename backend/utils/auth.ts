import type { FastifyRequest } from "fastify";
import { DEMO_USER_ID } from "../configs/demo-user";

const requireAuthenticatedUserId = (request: FastifyRequest): string => {
	// temporary authentication bypass for the demo deployment. Keep returning an actor ID that exists in users because clinical writes have a foreign key.
	return request.user?.id === DEMO_USER_ID ? request.user.id : DEMO_USER_ID;
};

export { requireAuthenticatedUserId };
