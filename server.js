const express = require('express');
var bodyParser = require('body-parser')
const fs = require("fs");


const app = express();
const server = require('https')
  .createServer({
        key: fs.readFileSync("key.pem"),
        cert: fs.readFileSync("cert.pem"),
      }, app);


const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(express.static('frontend'));

rooms = ['lobby','room 1'];

io.on('connection', (socket) => {

  socket.pseudo = "anonymous";
  socket.room = null;

  socket.emit("room-list", rooms);

  socket.on("join-room", (room) => {
    if(room != null){
      socket.leave(room);
    }

    socket.room = room;
    socket.join(room);

    if(!rooms.includes(room)){
      //nvl room
      rooms.push(room);
      io.emit("new-room", room);
    }

    //On envoie à tout les gens du channel le nouvel utilisateur
    socket.to(room).emit("new-user", socket.id);

    //On envoie au client la liste du tout les gens du channel
    const clients = io.sockets.adapter.rooms.get(room);
    clients.forEach((client) => {
      socket.emit("new-user", client);
    });

    socket.emit("new-text", {'text': `You are now connected to the room ${room}, use /nick [name] to change your default name.`});
    socket.to(room).emit("new-text", {'text': `${socket.pseudo} joined the room`});
  });


  socket.on("new-text", (message) => {
    if(socket.room != null){

    let args = message.text.split(" ");

    switch (args[0]) {
      case "/nick":
        if(args[1]){
          socket.pseudo = args[1];
          socket.emit("new-text", {'text':`Your pseudo is now ${args[1]}`});
        } else {
          socket.emit("new-text", {'text':`Usage: /nick [new_name]`});
        }
        break;
      default:
        message.sender = socket.pseudo;
        socket.to(socket.room).emit("new-text", message);
        socket.emit("new-text", message);
    }
  }});


  socket.on('disconnect', () => {
    socket.to(socket.room).emit("new-text", {'text': `${socket.id} left the room`});
    socket.to(socket.room).emit("delete-user", socket.id);
    console.log(`user ${socket.id} disconnected`);
  });



  socket.on("webRTC", (message) => {
    socket.to(message.peer).emit("webRTC", message);
  });
});

server.listen(3000, () => {
  console.log('Le serveur est en cours d\'exécution sur le port 3000');
  console.log('=> https://localhost:3000');
});
