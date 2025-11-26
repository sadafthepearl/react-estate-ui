import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: "http://localhost:5173",
  },
});

let onLineUser = [];

const addUser = (userId, socketId) => {
  const userExits = onLineUser.find((user) => user.userId === userId);
  if (!userExits) {
    onLineUser.push({ userId, socketId });
  }
};

const removeUser = (socketId) => {
  onLineUser = onLineUser.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return onLineUser.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  socket.on("newUser", (userId) => {
    addUser(userId, socket.id);
    console.log("Online Users:", onLineUser);
  });

  socket.on("sendMessage", ({ receiverId, data }) => {
    const receiver = getUser(receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("getMessage", data);
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
  });
});

io.listen(4000);
