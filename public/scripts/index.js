let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const messageContainer = document.getElementById('message-container')

function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(
        ".active-user.active-user--selected"
    );

    alreadySelectedUser.forEach(el => {
        el.setAttribute("class", "active-user");
    });
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");

    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class", "active-user active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        const nameOfCandidate = document.getElementsByClassName("username")
        talkingWithInfo.innerHTML = `Vous discutez avec: ` + nameOfCandidate[0].innerText;
        callUser(socketId);
    });

    return userContainerEl;
}

async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById("active-user-container");

    socketIds.forEach(socketId => {
        const alreadyExistingUser = document.getElementById(socketId);
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(socketId);
            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

const socket = io.connect("localhost:4000");

socket.on("update-user-list", ({ users }) => {
    updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Vous êtes seul dans le chat vidéo...`;
    if (elToRemove) {
        elToRemove.remove();
    }
});

socket.on("call-made", async data => {
    if (getCalled) {
        const confirmed = confirm(
            `L'utilisateur "Socket: ${data.socket}" souhaite discuter. Acceptez-vous cet appel?`
        );

        if (!confirmed) {
            socket.emit("reject-call", {
                from: data.socket
            });

            return;
        }
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to: data.socket
    });
    getCalled = true;
});

socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
        callUser(data.socket);
        isAlreadyCalling = true;
    }
});

socket.on("call-rejected", data => {
    alert(`L'utilisateur: "Socket: ${data.socket}" refuse de discuter avec vous.`);
    unselectUsersFromList();
});

peerConnection.ontrack = function({ streams: [stream] }) {
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
        remoteVideo.srcObject = stream;
    }
};

navigator.getUserMedia(
    { video: true, audio: true },
    stream => {
        const localVideo = document.getElementById("local-video");
        if (localVideo) {
            localVideo.srcObject = stream;
        }

        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    },
    error => {
        console.warn(error.message);
    }
);

/// CHAT______________________________
///==============================================
 socket.on('chat-message', data => {
     console.log(data)
     appendMessage(`${data.name}:  ${data.message}`)
 })

socket.on('user-connected', name => {
    console.log(name.name + " vient de se connecter avec le socketID: " + name.id)
    appendMessage(`${name.name} est connecté`)
    const div = document.getElementById(name.id)
    $(document).ready(function () {
        $(div).find('p.username').text(name.name)
    })
})

socket.on('user-disconnected', name =>{
    appendMessage(`${name} est déconnecté`)
})

messageForm.addEventListener('submit', e =>{
    e.preventDefault()
    const message = messageInput.value
    appendMessage(`Vous: ${message}`)
    socket.emit('send-chat-message', message)
    messageInput.value = '';
})

function appendMessage(message){
     const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
}

$(document).ready(function(){
   $("#pseudo-button").click(function () {
       const name = prompt("Avez-vous un nom ?")
       if (name != ''){
           $(this).css("cursor", "not-allowed")
           $(this).css("pointer-events", "none")
           $(this).text('Vous êtes: '+ name)
       }
       socket.emit('new-user', name)
   })
});