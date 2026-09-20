import type { FastifyInstance } from "fastify";
import { getAllUsers, getCurrentUser, getUserById } from "../../controllers/user/user.controller";

export async function userRoutes(fastify: FastifyInstance) {
    fastify.get('/me', getCurrentUser);
    fastify.get('', { preHandler: fastify.requirePermissions(['platform.users.read']) }, getAllUsers);
    fastify.get<{ Params: { id: string } }>('/:id', { preHandler: fastify.requirePermissions(['platform.users.read']) }, getUserById);

}
