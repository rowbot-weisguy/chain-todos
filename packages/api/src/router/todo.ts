import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { type Session } from "@acme/auth";
import { prisma } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pageRouter = createTRPCRouter({
  byPage: protectedProcedure
    .input(z.string().min(1))
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.page.findFirst({
        where: { id: input },
        include: { todos: true },
      });
      if (page == null || page?.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return page.todos;
    }),
  create: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.todo.create({ data: { pageId: input } });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().optional(),
        body: z.string().optional(),
        checked: z.boolean(),
        status: z.enum(["ARCHIVED", "LIVE"]),
      }),
    )
    .mutation(async ({ ctx, input: { id, ...data } }) => {
      const error = await getTodoAccessError(id, ctx.session);
      if (error) {
        throw error;
      }
      return ctx.prisma.todo.update({
        where: { id },
        data,
      });
    }),
  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      const error = await getTodoAccessError(input, ctx.session);
      if (error) {
        throw error;
      }
      return ctx.prisma.todo.delete({ where: { id: input } });
    }),
});

const getTodoAccessError = async (id: string, session: Session) => {
  const todo = await prisma.todo.findFirst({ where: { id } });
  if (!todo) {
    return new TRPCError({ code: "NOT_FOUND" });
  }
  const page = await prisma.page.findFirst({
    where: { id: todo.pageId },
  });
  if (!page) {
    return new TRPCError({
      code: "UNPROCESSABLE_CONTENT",
      message: "The parent page of this todo has been deleted",
    });
  }
  if (page.userId !== session.userId) {
    return new TRPCError({ code: "UNAUTHORIZED" });
  }
  return undefined;
};
