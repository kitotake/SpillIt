const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log("User connected", socket.id);
    socket.on("message", (data) => {
      console.log(data);
      io.emit("message", data);
    });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});