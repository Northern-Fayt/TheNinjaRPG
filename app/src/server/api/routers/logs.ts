import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { eq, and, inArray } from "drizzle-orm";
import { extractValueFromJson } from "@/utils/regex";
import { actionLog, village, bloodline } from "@/drizzle/schema";

export const logsRouter = createTRPCRouter({
  getContentChanges: protectedProcedure
    .input(
      z.object({
        cursor: z.number().nullish(),
        limit: z.number().min(1).max(100),
        relatedId: z.string().optional(),
        table: z.enum([
          "ai",
          "user",
          "item",
          "bloodline",
          "jutsu",
          "bloodline",
          "badge",
          "clan",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentCursor = input.cursor ? input.cursor : 0;
      const skip = currentCursor * input.limit;
      const entries = await ctx.drizzle.query.actionLog.findMany({
        where: and(
          eq(actionLog.tableName, input.table),
          ...(input.relatedId ? [eq(actionLog.relatedId, input.relatedId)] : []),
        ),
        columns: {
          userId: true,
          createdAt: true,
          changes: true,
          relatedId: true,
          relatedMsg: true,
          relatedImage: true,
        },
        with: {
          user: {
            columns: {
              username: true,
            },
          },
        },
        offset: skip,
        orderBy: (table, { desc }) => desc(table.createdAt),
        limit: input.limit,
      });
      // Overwrite all villageIds, bloodlineIds, etc. with their names
      const villageIds: string[] = [];
      const bloodlineIds: string[] = [];
      entries.forEach((entry) => {
        (entry.changes as string[]).forEach((change) => {
          const bloodlineId = extractValueFromJson(change, "bloodlineId");
          const villageId = extractValueFromJson(change, "villageId");
          if (bloodlineId) bloodlineIds.push(bloodlineId);
          if (villageId) villageIds.push(villageId);
        });
      });
      const [bloodlines, villages] = await Promise.all([
        ctx.drizzle.query.bloodline.findMany({
          where: inArray(bloodline.id, bloodlineIds),
          columns: { id: true, name: true },
        }),
        ctx.drizzle.query.village.findMany({
          where: inArray(village.id, villageIds),
          columns: { id: true, name: true },
        }),
      ]);

      // Return
      const nextCursor = entries.length < input.limit ? null : currentCursor + 1;
      return {
        data: entries.map((entry) => ({
          ...entry,
          changes: (entry.changes as string[])?.map((change) => {
            bloodlines.forEach((b) => {
              change = change.replace(b.id, b.name);
            });
            villages.forEach((v) => {
              change = change.replace(v.id, v.name);
            });
            return change;
          }),
        })),
        nextCursor: nextCursor,
      };
    }),
});
