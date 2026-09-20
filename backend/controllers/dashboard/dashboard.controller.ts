import type { FastifyReply, FastifyRequest } from "fastify";
import { getDashboard } from "../../services/dashboard/dashboard.service";
import { requireAuthenticatedUserId } from "../../utils/auth";
import { requireInstitutionId } from "../../utils/permissions";

const getDashboardDetails = async (request: FastifyRequest, reply: FastifyReply) => {
     requireAuthenticatedUserId(request);

     const details = await getDashboard(request.server, requireInstitutionId(request));

     return reply.code(200).send({
          data: details
     });
};

export {
     getDashboardDetails
};
