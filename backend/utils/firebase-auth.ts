import type { FastifyRequest } from "fastify";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAuth } from "../configs/firebase.config";
import { ClientFacingError } from "../errors/api-error";

type VerifyIdToken = (token: string) => Promise<Pick<DecodedIdToken, "uid">>;
type UserRecord = { id: string; email: string; status: "ACTIVE" | "SUSPENDED" | "DISABLED" };
type FindUserByFirebaseUid = (request: FastifyRequest, uid: string) => Promise<UserRecord | null>;

const verifyIdToken: VerifyIdToken = (token) =>
     getFirebaseAuth().verifyIdToken(token, true);

const findUserByFirebaseUid: FindUserByFirebaseUid = async (request, uid) => {
     const result = await request.server.pg.query<UserRecord>(
          "SELECT id, email, status FROM users WHERE firebase_uid = $1",
          [uid]
     );

     return result.rows[0] ?? null;
};

const authenticationRequired = () => new ClientFacingError({
     statusCode: 401,
     code: "AUTHENTICATION_REQUIRED",
     message: "Sign in to access this resource."
});

const invalidTokenCodes = new Set([
     "auth/argument-error",
     "auth/id-token-expired",
     "auth/id-token-revoked",
     "auth/invalid-id-token",
     "auth/user-disabled",
     "auth/user-not-found"
]);

const createFirebaseAuthHook = (
     verify: VerifyIdToken = verifyIdToken,
     findUser: FindUserByFirebaseUid = findUserByFirebaseUid
) => async (request: FastifyRequest) => {
     const header = request.headers.authorization;
     const match = typeof header === "string" ? /^Bearer ([^\s]+)$/i.exec(header) : null;

     if (!match?.[1]) throw authenticationRequired();

     let decoded: Pick<DecodedIdToken, "uid">;
     try {
          decoded = await verify(match[1]);
     } catch (error) {
          const code = typeof error === "object" && error !== null && "code" in error
               ? error.code
               : null;
          if (typeof code !== "string" || !invalidTokenCodes.has(code)) throw error;

          throw new ClientFacingError({
               statusCode: 401,
               code: "INVALID_ID_TOKEN",
               message: "The sign-in token is invalid or expired."
          });
     }

     if (typeof decoded.uid !== "string" || decoded.uid.length === 0) {
          throw new ClientFacingError({
               statusCode: 401,
               code: "INVALID_ID_TOKEN",
               message: "The sign-in token is invalid or expired."
          });
     }

     const user = await findUser(request, decoded.uid);
     if (user === null) {
          throw new ClientFacingError({
               statusCode: 403,
               code: "USER_NOT_PROVISIONED",
               message: "This account has not been given access to NataBridge."
          });
     }
     if (user.status !== "ACTIVE") {
          throw new ClientFacingError({
               statusCode: 403,
               code: "USER_INACTIVE",
               message: "This account is inactive."
          });
     }

     request.user = { id: user.id, email: user.email, firebaseUid: decoded.uid };
};

export { createFirebaseAuthHook, findUserByFirebaseUid };
export type { FindUserByFirebaseUid, VerifyIdToken };
