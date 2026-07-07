import "server-only";

import type { DriveMovementFrame, DrivePlayClip, DriveSummary } from "@projectedge/schemas";
import { driveMovementFrameSchema, drivePlayClipSchema, driveSummarySchema } from "@projectedge/schemas";
import { z } from "zod";

import { apiGet } from "@/lib/api-client";

export async function fetchDrives(gameId?: string, season?: number): Promise<DriveSummary[]> {
  return apiGet("/drives", z.array(driveSummarySchema), { game_id: gameId, season });
}

export async function fetchDrive(driveId: string): Promise<DriveSummary> {
  return apiGet(`/drives/${encodeURIComponent(driveId)}`, driveSummarySchema);
}

export async function fetchDriveClips(driveId: string): Promise<DrivePlayClip[]> {
  return apiGet(`/drives/${encodeURIComponent(driveId)}/clips`, z.array(drivePlayClipSchema));
}

export async function fetchDriveMovement(driveId: string): Promise<DriveMovementFrame[]> {
  return apiGet(`/drives/${encodeURIComponent(driveId)}/movement`, z.array(driveMovementFrameSchema));
}
