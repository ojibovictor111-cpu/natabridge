import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requirePermissions: (permissions: readonly string[]) => import('fastify').preHandlerHookHandler;
    findUserAccess: import('./services/user/user-access.service').FindUserAccess;
  }
  // opening the FastifyRequest interface to add our property
  interface FastifyRequest {
    institutionId: string | null;
    user: {
      id: string;
      email: string;
      firebaseUid: string;
    } | null;
  }
}
