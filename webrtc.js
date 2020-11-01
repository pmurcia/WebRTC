// Multimedia stream constraints (only video)
const videoConstraints = {
    video: true
};

// Create both RTCPeerConnection
const pca = new RTCPeerConnection();
pca.onicecandidate = (ev) => {
    console.log(`Candidate for A: ${ev.candidate}`);
    pcb.addIceCandidate(ev.candidate).then(() => {
        console.log("Candidate sent to B!");
    });
}

const pcb = new RTCPeerConnection();
pcb.onicecandidate = (ev) => {
    console.log(`Candidate for B: ${ev.candidate}`);
    pca.addIceCandidate(ev.candidate).then(() => {
        console.log("Candidate sent to A!");
    })
}
pcb.ontrack = (ev) => {
    if (remote.srcObject) return;
    remote.srcObject = ev.streams[0];
}

// Function to get video source
const getSource = (constraints) => {
    return navigator.mediaDevices.getUserMedia(constraints);
}

// Global variables
let inboundStream = null;

// HTML components
const local = document.getElementById("local");
const remote = document.getElementById("remote");

// Send video to the other peer
const connection = async () => {
    // Get stream data
    let stream = await getSource(videoConstraints);

    // Show webcam stream in local video element
    local.srcObject = stream;

    // The webcam info will be sent to the peer, need to define
    for(let track of stream.getTracks())
        pca.addTrack(track, stream);

    // To start connection, we need to create an SDP offer
    let offer = await pca.createOffer();

    // This offer (session) created will be set as the local description
    await pca.setLocalDescription(offer);

    // We set the peer remote SDP to the other peer local SDP
    await pcb.setRemoteDescription(offer);

    let answer = await pcb.createAnswer();

    await pcb.setLocalDescription(answer);
    await pca.setRemoteDescription(answer);
}

connection();