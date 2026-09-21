import { FastifyRequest, FastifyReply } from "fastify";
import { UserRequestPayload } from "../../models/users/user.model";
import { requireAuthenticatedUserId } from "../../utils/auth";

const getCurrentUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const id = requireAuthenticatedUserId(request);
    const access = await request.server.findUserAccess(request, id);
    return reply.code(200).send({
        data: { id, email: request.user!.email, ...access }
    });
};

const getAllUsers = async(request: FastifyRequest, reply: FastifyReply) => {
    // Logic to get all users
    return { message: 'List of users' };
}

const getUserById = async(request: FastifyRequest<{Params: {id: string}}>, reply: FastifyReply) => {
    const { id } = request.params;

}

const postUser = async(request: FastifyRequest<{Body: UserRequestPayload}>, reply: FastifyReply) => {
     // const incomingUser: UserRequestPayload = request.body;
}

export {
     getCurrentUser,
     getAllUsers,
     getUserById,
     postUser
}
