import prisma from "../lib/prisma.js";

export const getChats = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });

    const receiverIds = [
      ...new Set(
        chats
          .map((chat) => chat.userIDs.find((id) => id !== tokenUserId))
          .filter(Boolean)
      ),
    ];

    const receivers = await prisma.user.findMany({
      where: {
        id: {
          in: receiverIds,
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    const receiverMap = new Map(receivers.map((receiver) => [receiver.id, receiver]));

    const chatsWithReceiver = chats.map((chat) => {
      const receiverId = chat.userIDs.find((id) => id !== tokenUserId);
      return {
        ...chat,
        receiver: receiverMap.get(receiverId) || null,
      };
    });

    res.status(200).json(chatsWithReceiver);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chats!" });
  }
};

export const getChat = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chat = await prisma.chat.findFirst({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        message: {
          // Changed from messages to message
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!chat) return res.status(404).json({ message: "Chat not found!" });

    const seenBy = Array.isArray(chat.seenBy) ? chat.seenBy : [];
    const hasSeen = seenBy.includes(tokenUserId);
    const nextSeenBy = hasSeen ? seenBy : [...seenBy, tokenUserId];

    const updatedChat = await prisma.chat.update({
      where: {
        id: req.params.id,
      },
      data: {
        seenBy: nextSeenBy,
      },
      include: {
        message: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    res.status(200).json(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chat!" });
  }
};

export const addChat = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const newChat = await prisma.chat.create({
      data: {
        userIDs: [tokenUserId, req.body.receiverId],
      },
    });
    res.status(200).json(newChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to add chat!" });
  }
};

export const readChat = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chat = await prisma.chat.findFirst({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });

    if (!chat) return res.status(404).json({ message: "Chat not found!" });

    const seenBy = Array.isArray(chat.seenBy) ? chat.seenBy : [];
    const hasSeen = seenBy.includes(tokenUserId);
    const nextSeenBy = hasSeen ? seenBy : [...seenBy, tokenUserId];

    const updatedChat = await prisma.chat.update({
      where: {
        id: req.params.id,
      },
      data: {
        seenBy: nextSeenBy,
      },
    });
    res.status(200).json(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to read chat!" });
  }
};
