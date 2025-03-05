let isAlreadyCalling=false;
let getCalled=false;

const existingCalls=[];

const { RTCPeerConnection, RTCSessionDescription}=window;

const peerConnection=new RTCPeerConnection();

peerConnection.ontrack = function({ streams: [stream] }) {
    const remoteVideo = document.getElementById('remote-video');
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

async function callUser(socketId){
    const offer=await peerConnection.createOffer();
    console.log('Offer:', offer);
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit('call-user', {
        offer,
        to: socketId
    });
}

function createItemContainer(socketId){
    const userContainerEl=document.createElement('div');

    const usernameEl=document.createElement('p');

    userContainerEl.setAttribute('class', 'active-user');
    userContainerEl.setAttribute('id', socketId);
    usernameEl.setAttribute('class', 'username');
    usernameEl.innerHTML=`Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener('click', ()=>{
        // unselectUsersFromList();
        userContainerEl.setAttribute('class', "active-user active-user--selected");
        const talkingWithInfo=document.getElementById("talking-with-info");
        talkingWithInfo.innerHTML=`Talking with: "Scoket: ${socketId}"`;
        callUser(socketId);
    });
    return userContainerEl;
}


function updateUserList(socketIds){
    const activeUserContainer=document.getElementById('active-user-container');

    socketIds.forEach(socketId => {
        const alreadyExistingUser=document.getElementById(socketId);

        if(!alreadyExistingUser){
            const userContainerEl=createItemContainer(socketId);
            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

const socket = io.connect("http://localhost:5555");

socket.on('update-user-list', ({users})=>{
    updateUserList(users);
});

socket.on('remove-user', ({socketId})=>{
    const elToRemove=document.getElementById(socketId);

    if(elToRemove){
        elToRemove.remove();
    }
});

socket.on('call-made', async data=>{
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );

    const answer=await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit('make-answer', {
        answer,
        to: data.socket
    });
});


socket.on('answer-made', async data=>{
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    )

    if(!isAlreadyCalling){
        callUser(data.socket);
        isAlreadyCalling=true;
    }
})
