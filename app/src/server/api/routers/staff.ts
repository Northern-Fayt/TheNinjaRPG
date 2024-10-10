import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { baseServerResponse, errorResponse } from "@/server/api/trpc";
import { fetchBadge } from "@/routers/badge";
import { eq, and } from "drizzle-orm";
import { actionLog, statTemplate, userData, userItem, userJutsu, userBadge } from "@/drizzle/schema";
import { fetchUser } from "@/routers/profile";
import { getServerPusher, updateUserOnMap } from "@/libs/pusher";
import { z } from "zod";
import { nanoid } from "nanoid";
import { canUnstuckVillage, canModifyUserBadges } from "@/utils/permissions";
import type { inferRouterOutputs } from "@trpc/server";
import { MAX_GENS_CAP, MAX_STATS_CAP, type UserStatus } from "@/drizzle/constants";
import { statTemplateSchema, StatTemplateType } from "@/libs/combat/types";
import { DrizzleClient } from "@/server/db";
import { round } from "@/utils/math";

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
  insertUserBadge: protectedProcedure
    .input(z.object({ userId: z.string(), badgeId: z.string() }))
    .output(baseServerResponse)
    .mutation(async ({ ctx, input }) => {
      // Query
      const [user, badge] = await Promise.all([
        fetchUser(ctx.drizzle, ctx.userId),
        fetchBadge(ctx.drizzle, input.badgeId),
      ]);
      // Guard
      if (!user) return errorResponse("User not found");
      if (!badge) return errorResponse("Badge not found");
      if (!canModifyUserBadges(user.role)) return errorResponse("Not allowed for you");
      // Mutate
      await Promise.all([
        ctx.drizzle
          .insert(userBadge)
          .values([{ userId: input.userId, badgeId: input.badgeId }]),
        ctx.drizzle.insert(actionLog).values({
          id: nanoid(),
          userId: ctx.userId,
          tableName: "user",
          changes: [`Insert badge: ${badge.name}`],
          relatedId: input.userId,
          relatedMsg: `Insert badge: ${badge.name}`,
          relatedImage: user.avatar,
        }),
      ]);
      return { success: true, message: "Badge added" };
    }),
  removeUserBadge: protectedProcedure
    .input(z.object({ userId: z.string(), badgeId: z.string() }))
    .output(baseServerResponse)
    .mutation(async ({ ctx, input }) => {
      // Query
      const [user, badge, userbadge] = await Promise.all([
        fetchUser(ctx.drizzle, ctx.userId),
        fetchBadge(ctx.drizzle, input.badgeId),
        ctx.drizzle.query.userBadge.findFirst({
          where: and(
            eq(userBadge.userId, input.userId),
            eq(userBadge.badgeId, input.badgeId),
          ),
        }),
      ]);
      // Guard
      if (!user) return errorResponse("User not found");
      if (!badge) return errorResponse("Badge not found");
      if (!userbadge) return errorResponse("Badge not found");
      if (!canModifyUserBadges(user.role)) return errorResponse("Not allowed for you");
      // Mutate
      await Promise.all([
        ctx.drizzle
          .delete(userBadge)
          .where(
            and(
              eq(userBadge.userId, input.userId),
              eq(userBadge.badgeId, input.badgeId),
            ),
          ),
        ctx.drizzle.insert(actionLog).values({
          id: nanoid(),
          userId: ctx.userId,
          tableName: "user",
          changes: [`Remove badge: ${badge.name}`],
          relatedId: input.userId,
          relatedMsg: `Remove badge: ${badge.name}`,
          relatedImage: user.avatar,
        }),
      ]);

      return { success: true, message: "Badge removed" };
    }),
  // Copy user setting to Terriator - exclusive to Terriator user for debugging
  cloneUserForDebug: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .output(baseServerResponse)
    .mutation(async ({ ctx, input }) => {
      const user = await fetchUser(ctx.drizzle, ctx.userId);
      const target = await fetchUser(ctx.drizzle, input.userId);
      if (!user || !target) {
        return { success: false, message: "User not found" };
      }
      if (user.username !== "Terriator") {
        return { success: false, message: "You are not Terriator" };
      }
      if (target.username === "Terriator") {
        return { success: false, message: "Cannot copy Terriator to Terriator" };
      }
      const [targetJutsus, targetItems] = await Promise.all([
        ctx.drizzle.query.userJutsu.findMany({
          where: eq(userJutsu.userId, input.userId),
        }),
        ctx.drizzle.query.userItem.findMany({
          where: eq(userItem.userId, input.userId),
        }),
      ]);
      await Promise.all([
        ctx.drizzle.delete(userJutsu).where(eq(userJutsu.userId, user.userId)),
        ctx.drizzle.delete(userItem).where(eq(userItem.userId, user.userId)),
        ctx.drizzle
          .update(userData)
          .set({
            curHealth: target.curHealth,
            maxHealth: target.maxHealth,
            curStamina: target.curStamina,
            maxStamina: target.maxStamina,
            curChakra: target.curChakra,
            maxChakra: target.maxChakra,
            money: target.money,
            bank: target.bank,
            experience: target.experience,
            rank: target.rank,
            level: target.level,
            villageId: target.villageId,
            bloodlineId: target.bloodlineId,
            strength: target.strength,
            speed: target.speed,
            intelligence: target.intelligence,
            willpower: target.willpower,
            ninjutsuOffence: target.ninjutsuOffence,
            ninjutsuDefence: target.ninjutsuDefence,
            genjutsuOffence: target.genjutsuOffence,
            genjutsuDefence: target.genjutsuDefence,
            taijutsuOffence: target.taijutsuOffence,
            taijutsuDefence: target.taijutsuDefence,
            bukijutsuOffence: target.bukijutsuOffence,
            bukijutsuDefence: target.bukijutsuDefence,
            questData: target.questData,
            sector: target.sector,
            latitude: target.latitude,
            longitude: target.longitude,
          })
          .where(eq(userData.userId, ctx.userId)),
      ]);
      if (targetJutsus.length > 0) {
        await ctx.drizzle.insert(userJutsu).values(
          targetJutsus.map((userjutsu) => ({
            ...userjutsu,
            userId: ctx.userId,
            id: nanoid(),
          })),
        );
      }
      if (targetItems.length > 0) {
        await ctx.drizzle.insert(userItem).values(
          targetItems.map((useritem) => ({
            ...useritem,
            userId: ctx.userId,
            id: nanoid(),
          })),
        );
      }
      return { success: true, message: "User copied" };
    }),
  upsertStatTemplate: protectedProcedure
    .output(baseServerResponse)
    .input(statTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Guard
      const templateValidation = validateStatTemplate(input);
      if (!templateValidation.success) {
        return errorResponse(templateValidation.message);
      }
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

const calcStatTemplateTotal = (stats: any): number => {
  var result = round(
    Object.values(stats)
      .filter((stat) => typeof stat === "number")
      .reduce((acc, val) => acc + val, 0),
    5,
  );
  console.log("result", result);
  return result;
};

const validateStatTemplate = (stats: StatTemplateType) => {
  if (stats.scalingType === "FLAT") {
    if (stats.bukijutsuDefence < 10 || stats.bukijutsuDefence > MAX_STATS_CAP)
      return {
        message: "bukijutsuDefence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.genjutsuDefence < 10 || stats.genjutsuDefence > MAX_STATS_CAP)
      return {
        message: "genjutsuDefence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.ninjutsuDefence < 10 || stats.ninjutsuDefence > MAX_STATS_CAP)
      return {
        message: "ninjutsuDefence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.taijutsuDefence < 10 || stats.taijutsuDefence > MAX_STATS_CAP)
      return {
        message: "taijutsuDefence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.offence < 10 || stats.offence > MAX_STATS_CAP)
      return {
        message: "Offence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.intelligence < 10 || stats.intelligence > MAX_GENS_CAP)
      return {
        message: "Intelligence is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.strength < 10 || stats.strength > MAX_GENS_CAP)
      return {
        message: "Strength is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.speed < 10 || stats.speed > MAX_GENS_CAP)
      return {
        message: "Speed is either lower than 10 or above max stat cap",
        success: false,
      };
    if (stats.willpower < 10 || stats.willpower > MAX_GENS_CAP)
      return {
        message: "Willpowder is either lower than 10 or above max stat cap",
        success: false,
      };
  }

  if (stats.scalingType === "PERCENTAGE") {
    if (calcStatTemplateTotal(stats) !== 1)
      return {
        message: "Total of all stats must add to 1 when scaling type is PERCENTAGE",
        success: false,
      };
    const emptyStats = Object.values(stats).filter((stat) => stat === 0).length;
    if (emptyStats > 0) return { message: "Stats cannot be set to 0", success: false };
  }

  return { message: "Stat template is valid", success: true };
};
export type staffRouter = inferRouterOutputs<typeof staffRouter>;
