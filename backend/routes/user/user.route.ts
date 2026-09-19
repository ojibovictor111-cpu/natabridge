import type { FastifyInstance } from "fastify";
import { getAllUsers, getCurrentUser, getUserById } from "../../controllers/user/user.controller";

export async function userRoutes(fastify: FastifyInstance) {
    fastify.get('/me', getCurrentUser);
    fastify.get('', getAllUsers);
    fastify.get('/:id', getUserById);

}
