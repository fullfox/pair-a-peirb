const express = require('express');
var bodyParser = require('body-parser')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(express.static('frontend'));


io.on('connection', (socket) => {



  //join channel
  socket.join("media-channel-11");
  //On envoie à tout les gens du channel le nouvel utilisateur
  socket.to("media-channel-11").emit("new-user", socket.id);

  //On envoie au client la liste du tout les gens du channel
  const clients = io.sockets.adapter.rooms.get("media-channel-11");
  clients.forEach((client) => {
    socket.emit("new-user", client);
  });

  socket.emit("new-text", {'text': `You are now connected to the room ${"media-channel-11"}`});
  socket.to("media-channel-11").emit("new-text", {'text': `${socket.id} joined the room`});

  socket.on("join-room", (room) => {

    //si nvl room, informez les gens de la nvl room (ssi room publique)

    //join room
  });


  socket.on("new-text", (message) => {
    socket.to("media-channel-11").emit("new-text", message);
    socket.emit("new-text", message);
  });






  socket.on('disconnect', () => {
    socket.to("media-channel-11").emit("new-text", {'text': `${socket.id} left the room`});
    socket.to("media-channel-11").emit("delete-user", socket.id);
    console.log(`user ${socket.id} disconnected`);
  });



  socket.on("webRTC", (message) => {
    socket.to(message.peer).emit("webRTC", message);
  });
});

server.listen(3000, () => {
  console.log('Le serveur est en cours d\'exécution sur le port 3000');
});
