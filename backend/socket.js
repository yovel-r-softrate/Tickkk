const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN === '*' ? '*' : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : '*'),
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
      }
    });

    // Authentication middleware for sockets
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }
      try {
        const decoded = jwt.decode(token);
        if (!decoded) throw new Error("Invalid token format");
        
        const userData = decoded.user || decoded;
        if (!userData || (!userData.id && !userData._id)) throw new Error("Invalid token structure");
        
        socket.user = userData;
        socket.user.id = userData.id || userData._id;
        next();
      } catch (err) {
        next(new Error("Authentication error: Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      console.log("Client connected via Socket.IO:", socket.id, "User ID:", socket.user._id);

      // Client requests to join their specific data room
      socket.on("joinRoom", (data) => {
        const orgId = data.orgId;
        if (orgId) {
          const roomName = `org_${orgId}`;
          socket.join(roomName);
          console.log(`Socket ${socket.id} joined room: ${roomName}`);
        } else {
          // Personal room if they don't have an organization
          const roomName = `user_${socket.user._id}`;
          socket.join(roomName);
          console.log(`Socket ${socket.id} joined personal room: ${roomName}`);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error("Socket.io is not initialized!");
    }
    return io;
  }
};
