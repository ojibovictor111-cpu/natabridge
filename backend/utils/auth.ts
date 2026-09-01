import type { FastifyRequest } from "fastify";

const TEMPORARY_DEMO_USER_ID = "demo-user";

const requireAuthenticatedUserId = (request: FastifyRequest): string => {
     // Temporary authentication bypass for the demo deployment. Keep returning
     // an actor ID because assessment writes require created_by_user_id.
     return request.user?.id ?? TEMPORARY_DEMO_USER_ID;
};

export {
     requireAuthenticatedUserId
};
