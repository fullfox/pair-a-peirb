let socket = io.connect(window.location.origin);
let remoteVideos = document.getElementById("remoteVideos");
let pc = {};
let localStream = null;

let channel = null;

let color = ['#8e44ad', '#2980b9', '#27ae60', '#f39c12'];

let RTCPeerConfig = {
  iceServers: [
   {'urls': 'stun:stun.stunprotocol.org:3478'},
   {'urls': 'stun:stun.l.google.com:19302'},
 ]
};



socket.on('connect', function() {
});



let room_i = 0;
function addChannel(room){
  let channelHTML = document.createElement("div");
  channelHTML.classList.add("channel");
  channelHTML.innerText = room;
  if(room == channel){
    //si connecté
    channelHTML.style.background = color[room_i%color.length];
  }
  channelHTML.setAttribute("onclick", `joinRoom("${room}", this, "${color[room_i%color.length]}")`);
  document.getElementById("channels").appendChild(channelHTML);
  room_i++;
}

socket.on("room-list", function(rooms) {
  for (var room of rooms) {
    addChannel(room);
  }
});

socket.on("new-room", function(room) {
  addChannel(room);
});



//connect to room
function joinRoom(room, elem, color = "red"){
  document.getElementById("textbox").disabled = false;

  if(room != channel){
    for (let item of document.getElementsByClassName('channel')) {
      item.style.background = "";
    }

    if(elem) elem.style.background = color;

    document.getElementById("chat").style.background = color + "50";

    document.getElementById("chat-content").innerHTML = "";
    channel = room;
    socket.emit("join-room", room);
  }
}

function createRoom(room){
  joinRoom(room, null, color[room_i%color.length]);
}



socket.on("new-text", function(msg) {


  let obj = document.createElement("p");

  if(msg.sender){
  obj.innerHTML = `<b>[${msg.sender}]</b>: ${msg.text}`;
} else {
  obj.innerHTML = `<i>${msg.text}</i>`;
}
  document.getElementById("chat-content").appendChild(obj);
});

function sendText(input){
  socket.emit("new-text", {'text': input.value});
  input.value = "";
}

socket.on("new-user", function(id) {
  console.log(id);

  if(id == socket.id) return;

  pc[id] = new RTCPeerConnection(RTCPeerConfig);
  pc[id].onicecandidate = function(event) {
    console.log("ice");
    if(event.candidate != null) {
      socket.emit("webRTC", {'ice': event.candidate, 'peer': id, 'sender': socket.id});
    }
  };

  pc[id].ontrack = event => {
    console.log("ontrack");
    let audioOnly = (event.streams[0].getVideoTracks().length == 0);

    let remoteVideo = document.getElementById(id);

    if(remoteVideo == null){
      remoteVideo = document.createElement("video");
      remoteVideo.id = id;
      if(audioOnly){
        remoteVideo.style.display = "none";
      }
      remoteVideo.setAttribute("autoplay", "");
      remoteVideo.classList.add("remoteVideo");
      remoteVideos.appendChild(remoteVideo);
    }

    remoteVideo.srcObject = event.streams[0];
    if(!audioOnly){
      remoteVideo.srcObject.getVideoTracks()[0].onmute = () => {
        remoteVideo.remove();
      }
    }
   };

   if(localStream != null){
     createOffer(id);
   }
});

socket.on("delete-user", function(id) {
  if(document.getElementById(id)) document.getElementById(id).remove();
  delete pc[id];
});

socket.on("webRTC", function(data) {
  let id = data.sender;

  if(data.sdp) {
    console.log(`got remote descrition from ${id}`);
    pc[id].setRemoteDescription(data.sdp);

    if(data.sdp.type == 'offer') {
        pc[id].createAnswer()
          .then(function (answer) {
            pc[id].setLocalDescription(answer);

            socket.emit("webRTC", {'sdp': answer, 'peer': id, 'sender': socket.id});

          }).catch(function (error) { console.error(error); });
    }
  } else if(data.ice){
    console.log(`got ice from ${id}`);
    pc[id].addIceCandidate(new RTCIceCandidate(data.ice)).catch(function (error) { console.error(error); });
  }
});


function createOffer(id){
  pc[id].addStream(localStream);
  pc[id].createOffer().then(function(offer) {
      console.log("set local description");
      pc[id].setLocalDescription(offer);
      socket.emit("webRTC", {'sdp': offer, 'peer': id, 'sender': socket.id});
    }).catch(function(error) {
      console.error("Error creating offer: ", error);
    });
}


let videoActivated = false;
let audioActivated = false;

function capture(){
  if(channel == null) return;

  if(localStream != null){
    const tracks = localStream.getTracks();
    tracks.forEach((track) => {
      track.stop();
    });
  }

  if(!videoActivated && !audioActivated) return;

  localStream = new MediaStream();
  navigator.mediaDevices.getUserMedia({ video: videoActivated, audio: audioActivated })
    .then(function(stream) {
        localStream = stream;
        for (var id of Object.keys(pc)) {
          createOffer(id);
        }
    }).catch(function(error) {
      console.error("Error accessing media devices: ", error);
    });
}

function streamVideo(elem){
  elem.src = videoActivated ? "novideo.png" : "video.png";
  videoActivated = !videoActivated;
  capture();
}

function streamAudio(elem){
  elem.src = audioActivated ? "mute.png" : "talk.png";
  audioActivated = !audioActivated;
  capture();
}
