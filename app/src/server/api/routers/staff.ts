import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { baseServerResponse, errorResponse } from "@/server/api/trpc";
import { eq } from "drizzle-orm";
import { actionLog, statTemplate, userData } from "@/drizzle/schema";
import { fetchUser } from "@/routers/profile";
import { getServerPusher, updateUserOnMap } from "@/libs/pusher";
import { z } from "zod";
import { nanoid } from "nanoid";
import { canUnstuckVillage } from "@/utils/permissions";
import type { inferRouterOutputs } from "@trpc/server";
import type { UserStatus } from "@/drizzle/constants";
import { statTemplateSchema } from "@/libs/combat/types";
import { DrizzleClient } from "@/server/db";

export const staffRouter = createTRPCRouter({
  forceAwake: protectedProcedure
    .output(baseServerResponse)
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Query
      const [user, targetUser] = await Promise.all([
        fetchUser(ctx.drizzle, ctx.userId),
        fetchUser(ctx.drizzle, input.userId),
      ]);
      // Guard
      if (!user) return errorResponse("User not found");
      if (!canUnstuckVillage(user.role)) return errorResponse("Not allowed for you");
      // Mutate
      await Promise.all([
        ctx.drizzle.insert(actionLog).values({
          id: nanoid(),
          userId: ctx.userId,
          tableName: "userData",
          relatedId: input.userId,
          relatedMsg: `Force updated status to awake from status: ${targetUser.status}`,
          changes: [`Previous BattleId: ${targetUser.battleId}`],
        }),
        ctx.drizzle
          .update(userData)
          .set({ status: "AWAKE" })
          .where(eq(userData.userId, targetUser.userId)),
      ]);
      // Push status update to sector
      const output = {
        longitude: user.longitude,
        latitude: user.latitude,
        sector: user.sector,
        avatar: user.avatar,
        level: user.level,
        villageId: user.villageId,
        battleId: user.battleId,
        username: user.username,
        status: "AWAKE" as UserStatus,
        location: "",
        userId: ctx.userId,
      };
      const pusher = getServerPusher();
      void updateUserOnMap(pusher, user.sector, output);
      // Done
      return {
        success: true,
        message: "You have changed user's state to awake",
      };
    }),
  upsertStatTemplate: protectedProcedure
    .output(baseServerResponse)
    .input(statTemplateSchema) // Corrected input method
    .mutation(async ({ ctx, input }) => {
      // Guard
      console.log(input);
      // Query
      const existingTemplate = input.id
        ? await fetchStatTemplate(ctx.drizzle, input.id)
        : null;
      // Mutate
      existingTemplate
        ? await ctx.drizzle
            .update(statTemplate)
            .set({
              ...input,
            })
            .where(eq(statTemplate.id, existingTemplate.id))
        : await ctx.drizzle.insert(statTemplate).values({
            bloodlineId: undefined,
            ...input,
          });

      // Done
      return {
        success: true,
        message: "Stat template has been upserted successfully",
      };
    }),
  fetchAllStatTemplates: protectedProcedure
    .output(z.array(statTemplateSchema))
    .input(z.object({ withDefault: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      // Fetch all stat templates
      const statTemplates = await ctx.drizzle.query.statTemplate
        .findMany()
        .then((templates) =>
          templates.map((template) => statTemplateSchema.parse(template)),
        );

      //add default stat template
      if (input.withDefault) {
        statTemplates.unshift(statTemplateSchema.parse({}));
      }

      // Return the fetched stat templates
      return statTemplates;
    }),
});

export const fetchStatTemplate = async (
  client: DrizzleClient,
  statTemplateId: string,
) => {
  const template = await client.query.statTemplate.findFirst({
    where: eq(statTemplate.id, statTemplateId),
  });

  return template;
};

export type staffRouter = inferRouterOutputs<typeof staffRouter>;
