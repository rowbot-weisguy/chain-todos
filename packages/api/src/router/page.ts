import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { type Session } from "@acme/auth";
import { prisma } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pageRouter = createTRPCRouter({
  all: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.page.findMany({
      orderBy: { id: "desc" },
      where: { userId: ctx.session.userId },
    });
  }),
  byId: protectedProcedure.input(z.string().min(1)).query(({ ctx, input }) => {
    return ctx.prisma.page.findFirst({
      where: { id: input, userId: ctx.session.userId },
      include: { todos: true },
    });
  }),
  create: protectedProcedure.mutation(({ ctx }) => {
    return ctx.prisma.page.create({ data: { userId: ctx.session.userId } });
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input: { id, ...data } }) => {
      const pageAccessError = await getPageAccessError(id, ctx.session);
      if (pageAccessError) {
        throw pageAccessError;
      }
      return ctx.prisma.page.update({ where: { id }, data });
    }),
  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.page.delete({ where: { id: input } });
    }),
});

const getPageAccessError = async (id: string, session: Session) => {
  const page = await prisma.page.findFirst({
    where: { id },
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
