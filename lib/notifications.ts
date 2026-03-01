import { prisma } from "@/lib/prisma";

type EventNotificationInput = {
  eventId: string;
  professorId: string;
  title: string;
  body: string;
  type: "event_created" | "event_live";
};

type LiveNotificationInput = {
  professorId: string;
  title: string;
  body: string;
  type: "event_live";
  tagIds: string[];
  eventId?: string;
};

type Recipient = {
  id: string;
  email: string;
  name: string | null;
};

async function buildRecipients(professorId: string, tagIds: string[]) {
  const [profFollowers, tagFollowers] = await Promise.all([
    prisma.followProfessor.findMany({
      where: { professorId },
      select: { studentId: true },
    }),
    tagIds.length === 0
      ? Promise.resolve([])
      : prisma.followTag.findMany({
          where: {
            tagId: {
              in: tagIds,
            },
          },
          select: { studentId: true },
        }),
  ]);

  const recipients = new Set<string>();
  for (const row of profFollowers) recipients.add(row.studentId);
  for (const row of tagFollowers) recipients.add(row.studentId);
  recipients.delete(professorId);

  if (recipients.size === 0) return [] as Recipient[];

  return prisma.user.findMany({
    where: { id: { in: [...recipients] } },
    select: { id: true, email: true, name: true },
  });
}

export async function notifyFollowersForEvent(input: EventNotificationInput) {
  const eventTags = await prisma.eventTag.findMany({
    where: { eventId: input.eventId },
    select: { tagId: true },
  });

  const recipients = await buildRecipients(
    input.professorId,
    eventTags.map((item: { tagId: string }) => item.tagId),
  );

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((recipient: Recipient) => ({
      userId: recipient.id,
      eventId: input.eventId,
      title: input.title,
      body: input.body,
      type: input.type,
    })),
  });

}

export async function notifyFollowersForLiveSession(input: LiveNotificationInput) {
  const recipients = await buildRecipients(input.professorId, input.tagIds);
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((recipient: Recipient) => ({
      userId: recipient.id,
      eventId: input.eventId,
      title: input.title,
      body: input.body,
      type: input.type,
    })),
  });

}
