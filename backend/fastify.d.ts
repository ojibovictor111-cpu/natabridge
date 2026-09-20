import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requirePermissions: (permissions: readonly string[]) => import('fastify').preHandlerHookHandler;
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
