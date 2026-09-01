import type { FastifyInstance } from "fastify";

type DashboardRow = {
     assessment_id: string;
     patient_id: string;
     name: string;
     age: string | number;
     gestational_age: string | number | null;
     prediction: string;
     confidence: string | number;
     created_at: string | Date;
     systolic_bp: string | number;
     diastolic_bp: string | number;
     blood_sugar: string | number;
     body_temperature_celsius: string | number;
     heart_rate: string | number;
     factors: Array<{ feature: string; impact: string | number }>;
};

const getDashboard = async (
     server: FastifyInstance,
) => {
     const client = await server.pg.connect();

     try {
          const rows = await client.query<DashboardRow>("SELECT * FROM get_dashboard_details");

          const assessments = rows.rows.map((row) => ({
               id: row.assessment_id,
               patientId: row.patient_id,

               name: row.name,
               age: Number(row.age),
               gestationalAge: row.gestational_age
                    ? Number(row.gestational_age)
                    : null,

               currentRiskLevel: row.prediction,
               confidence: Number(row.confidence),

               lastAssessment: row.created_at,

               systolicBP: Number(row.systolic_bp),
               diastolicBP: Number(row.diastolic_bp),
               bloodSugar: Number(row.blood_sugar),
               bodyTemperatureCelsius: Number(
                    row.body_temperature_celsius
               ),
               heartRate: Number(row.heart_rate),

               factors: row.factors.map((factor) => ({
                    feature: factor.feature,
                    impact: Number(factor.impact)
               }))
          }));

          return {
               summary: {
                    high: assessments.filter(
                         (item) => item.currentRiskLevel === "High Risk"
                    ).length,

                    mid: assessments.filter(
                         (item) => item.currentRiskLevel === "Mid Risk"
                    ).length,

                    low: assessments.filter(
                         (item) => item.currentRiskLevel === "Low Risk"
                    ).length
               },

               priorityAssessments: assessments.filter(
                    (item) => item.currentRiskLevel === "High Risk"
               ),

               recentAssessments: assessments
          };
     } finally {
          client.release();
     }
};

export {
     getDashboard
}
