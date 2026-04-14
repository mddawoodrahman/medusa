import { NextRequest, NextResponse } from "next/server";

import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite";
import { createRequestId, logger } from "@/lib/observability/logger";
import { getRedisClient, isRedisEnabled } from "@/lib/redis";

export const dynamic = "force-dynamic";

const USERS_CREATE_PERMISSION = 'create("users")';

type HealthCheckResult = {
  ok: boolean;
  details: Record<string, unknown>;
};

const unauthorizedResponse = (requestId: string) =>
  NextResponse.json(
    {
      status: "error",
      error: "Unauthorized",
      requestId,
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

const runRedisHealthCheck = async (): Promise<HealthCheckResult> => {
  if (!isRedisEnabled()) {
    return {
      ok: false,
      details: {
        configured: false,
        reason: "REDIS_URL is not configured",
      },
    };
  }

  const redis = getRedisClient();

  if (!redis) {
    return {
      ok: false,
      details: {
        configured: true,
        reason: "Redis client could not be initialized",
      },
    };
  }

  const startedAt = Date.now();

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    const pong = await redis.ping();

    return {
      ok: pong === "PONG",
      details: {
        configured: true,
        status: redis.status,
        pong,
        latencyMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      ok: false,
      details: {
        configured: true,
        status: redis.status,
        reason:
          error instanceof Error ? error.message : "Unknown Redis connectivity error",
      },
    };
  }
};

const runAppwriteBucketHealthCheck = async (): Promise<HealthCheckResult> => {
  try {
    const { storage } = await createAdminClient();
    const bucket = await storage.getBucket(appwriteConfig.bucketId);
    const permissions = Array.isArray(bucket.$permissions) ? bucket.$permissions : [];

    const hasUsersCreatePermission = permissions.includes(USERS_CREATE_PERMISSION);
    const isHealthy =
      Boolean(bucket.enabled) &&
      Boolean(bucket.fileSecurity) &&
      hasUsersCreatePermission;

    return {
      ok: isHealthy,
      details: {
        bucketId: bucket.$id,
        enabled: bucket.enabled,
        fileSecurity: bucket.fileSecurity,
        hasUsersCreatePermission,
        permissions,
        maximumFileSize: bucket.maximumFileSize,
      },
    };
  } catch (error) {
    return {
      ok: false,
      details: {
        reason:
          error instanceof Error ? error.message : "Unknown Appwrite bucket error",
      },
    };
  }
};

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const configuredHealthToken = process.env.STARTUP_HEALTH_TOKEN;
  const providedToken = request.headers.get("x-startup-health-token");

  if (configuredHealthToken && providedToken !== configuredHealthToken) {
    logger.warn("Startup health probe rejected: invalid token", {
      requestId,
      route: "/api/health/startup",
    });

    return unauthorizedResponse(requestId);
  }

  const [redis, appwriteBucket] = await Promise.all([
    runRedisHealthCheck(),
    runAppwriteBucketHealthCheck(),
  ]);

  const healthy = redis.ok && appwriteBucket.ok;
  const statusCode = healthy ? 200 : 503;

  if (!healthy) {
    logger.error(
      "Startup health check failed",
      {
        requestId,
        route: "/api/health/startup",
      },
      {
        redis: redis.details,
        appwriteBucket: appwriteBucket.details,
      },
    );
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      requestId,
      timestamp: new Date().toISOString(),
      checks: {
        redis: redis,
        appwriteBucket: appwriteBucket,
      },
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
