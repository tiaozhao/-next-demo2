// db.server.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { loggerService } from "./lib/logger";

function safeSerialize(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

const openTelemetryExtension = Prisma.defineExtension({
  name: "OpenTelemetryExtension",
  query: {
    async $allOperations({ operation, model, args, query }) {
      const tracer = trace.getTracer("prisma-client");
      return tracer.startActiveSpan(`prisma:${model}.${operation}`, async (span) => {
        try {
          span.setAttributes({
            "db.system": "postgresql",
            "db.name": "prisma",
            "db.operation": operation,
            "db.model": model,
            "db.statement": safeSerialize(args),
          });

          const result = await query(args);

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          });
          loggerService.error("Prisma operation failed", {
            error,
            operation,
            model,
            args: safeSerialize(args),
          });
          throw error;
        } finally {
          span.end();
        }
      });
    },
  },
});

function createPrismaClient() {
  const client = new PrismaClient();
  return client.$extends(openTelemetryExtension);
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
