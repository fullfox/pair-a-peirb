let socket = io.connect(window.location.origin);
let remoteVideos = document.getElementById("remoteVideos");
let pc = {};
let localStream = null;

let channel = "webRTC";

let RTCPeerConfig = {
  iceServers: [
   {'urls': 'stun:stun.stunprotocol.org:3478'},
   {'urls': 'stun:stun.l.google.com:19302'},
 ]
};



socket.on('connect', function() {
});


//connect to room
function joinRoom(room){
  socket.emit("join-room", {'room': room});
}
joinRoom("channel-11");

socket.on("new-text", function(msg) {
  let obj = document.createElement("p");
  obj.innerText = msg.text;
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

  let remoteVideo = document.createElement("video");
  remoteVideo.id = id;
  remoteVideo.setAttribute("autoplay", "");
  remoteVideo.classList.add("remoteVideo");
  remoteVideos.appendChild(remoteVideo);

  pc[id].ontrack = event => {
    console.log("ontrack");
    document.getElementById(id).srcObject = event.streams[0];
   };

   if(localStream != null){
     createOffer(id);
   }
});

socket.on("delete-user", function(id) {
  document.getElementById(id).remove();
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


function capture(){
  localStream = new MediaStream();
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(function(stream) {
        localStream = stream;
        for (var id of Object.keys(pc)) {
          createOffer(id);
        }
    }).catch(function(error) {
      console.error("Error accessing media devices: ", error);
    });
}
