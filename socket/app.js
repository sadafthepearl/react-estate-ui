import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.SOCKET_PORT || 4000;

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = [];

const addUser = (userId, socketId) => {
  if (!onlineUsers.find((u) => u.userId === userId)) {
    onlineUsers.push({ userId, socketId });
  }
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((u) => u.socketId !== socketId);
};

const getUser = (userId) => {
  return onlineUsers.find((u) => u.userId === userId);
};

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("newUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("onlineUsers", onlineUsers);
  });

  socket.on("sendMessage", ({ receiverId, data }) => {
    const receiver = getUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("getMessage", data);
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("onlineUsers", onlineUsers);
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`⚡ Socket.IO running on port ${PORT}`);
});
