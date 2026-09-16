import { FastifyInstance, FastifyRequest } from "fastify";
import { getAllUsers, getUserById } from "../../controllers/user/user.controller";
import { Static, Type } from "@fastify/type-provider-typebox";
import { ClientFacingError } from "../../errors/api-error";
import { DEMO_USER_EMAIL, DEMO_USER_ID } from "../../configs/demo-user";

const DEMO_USER_PASSWORD = "12345";

export async function userRoutes(fastify: FastifyInstance) {
    fastify.get('', getAllUsers);
    fastify.get('/:id', getUserById);

    const authCredentialsSchema = Type.Object({
        id: Type.String({ format: "email", maxLength: 255 }),
        password: Type.String({ minLength: 1, maxLength: 100 })
    }, { additionalProperties: false });

    // demo endpoint to simulate login
    fastify.post('/login', async (request: FastifyRequest<{
        Body: Static<typeof authCredentialsSchema>
    }>, reply) => {
        if (
            request.body.id.trim().toLowerCase() !== DEMO_USER_EMAIL
            || request.body.password !== DEMO_USER_PASSWORD
        ) {
            throw new ClientFacingError({
                statusCode: 401,
                code: "INVALID_CREDENTIALS",
                message: "The email or password is incorrect."
            });
        }

        const productionFrontendUsesHttps = process.env.frontend_origin
            ?.trim()
            .toLowerCase()
            .startsWith("https://") === true;

        reply.setCookie('session_id', DEMO_USER_ID, {
            httpOnly: true,
            sameSite: productionFrontendUsesHttps ? 'none' : 'lax',
            secure: productionFrontendUsesHttps,
            path: '/'
        });

        return reply.code(200).send({
            data: {
                id: DEMO_USER_ID,
                email: DEMO_USER_EMAIL
            },
            message: 'User logged in'
        });
    });
}
