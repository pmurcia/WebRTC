// Properties of call
const streamConstraints = {
    'audio': true,
    'video': true
}
let videoConstraints = {};
videoConstraints = new Proxy(videoConstraints, {
    // Intercept property writing
    set(target, property, value) {
        // Write info
        target[property] = value;

        acquireMedia().then(() => {
            updateUI(property);
        });
    }
});

// Global variables
let pca;
let pcb;
let stream;
let callProperties = { 'call': false };
callProperties = new Proxy(callProperties, {
    // Intercept property writing
    set(target, property, value) {
        // Write info
        target[property] = value;

        let button = document.getElementById(property);
        let icon = button.children[0];

        if(value) {
            button.classList.add("calling");
            icon.innerText = icon.innerText + "_end";
        } else {
            button.classList.remove("calling");
            icon.innerText = icon.innerText.split("_end")[0];
        }
    }
});

// HTML components
let remote = document.getElementById("remote");
let local = document.getElementById("local");

remote.srcObject = null;
local.srcObject = null;

// Toggle connection constraints
const toggleSource = (source) => {
    // Check video constraints and toggle if exists
    if(!videoConstraints[source])
        videoConstraints[source] = true;
    else
        videoConstraints[source] = !videoConstraints[source];
}

// Update UI
const updateUI = (source) => {
    // Make changes in UI
    let elem = document.getElementById(source);
    let icon = elem.children[0];

    if(icon.innerText.endsWith("_off") && videoConstraints[source])
        icon.innerText = icon.innerText.split("_off")[0];
    else if(!videoConstraints[source])
        icon.innerText = icon.innerText + "_off";

    if(source == 'video') {
        local.srcObject = videoConstraints[source] ? stream : null;
    }
}

// Function to acquire the device media from the user
const acquireMedia = async () => {
    stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
}

// Function to establish a communication
const call = async () => {
    if(callProperties.call) {
        callProperties.call = false;

        pca.close();
        pcb.close();

        pca = null;
        pcb = null;

        remote.srcObject = null;

    } else {
        callProperties.call = true;

        try {
            // Check if PeerConnection already exists
            if(!pca || !pcb) {
                // Create RTCPeerConnection
                console.log("Creating connections...");
                pca = new RTCPeerConnection();
                pcb = new RTCPeerConnection();
                console.log("Connections created!");

                // Add event handlers for ICE candidates collected
                pca.onicecandidate = (ev) => {
                    if(ev.candidate) {
                        // Show candidate on console
                        console.log('Candidate for A: %o', ev.candidate);
                        
                        // Add candidate to PCB
                        pcb.addIceCandidate(ev.candidate).then(() => {
                            console.log("Candidate sent to B!");
                        });
                    }
                }

                // IDEM
                pcb.onicecandidate = (ev) => {
                    if(ev.candidate) {
                        console.log('Candidate for B: %o', ev.candidate);
                        pca.addIceCandidate(ev.candidate).then(() => {
                            console.log("Candidate sent to A!");
                        });
                    }
                }

                // Show track received on the video element
                pcb.ontrack = (ev) => {
                    // If there's video playing, don't change it
                    if(remote.srcObject) return;

                    // Assign the stream to the remote video
                    remote.srcObject = ev.streams[0];
                    console.log("Inbound stream loaded!")
                }

            }
            
            // Add tracks to connection
            for(let track of stream.getTracks())
                pca.addTrack(track, stream);
            console.log("Tracks added!");
            
            // Once the tracks are added, we will create an offer
            let offer = await pca.createOffer();
            console.log("Offer created!");
            
            // We set that offer as the local descriptor
            await pca.setLocalDescription(offer);
            console.log("Saved onto local SDP for A");

            // At this point, the ICE candidates are generated for PCA.

            /* After that, we "send" the offer through the channel to PCB,
            and sets it as the remote description */
            await pcb.setRemoteDescription(offer);
            console.log("Saved onto remote SDP for B")
            
            // At this point, one direction is set. Next, we do the same for PCB.
            // As PCB does't send a thing, we can just create the answer.
            let answer = await pcb.createAnswer();
            console.log("Answer created!");

            // As before, we set is as the local description
            await pcb.setLocalDescription(answer);
            console.log("Saved onto local SDP for B");

            // The ICE candidates for PCB are generated, and the info is sent to PCA
            await pca.setRemoteDescription(answer);
            console.log("Saved onto remote SDP for A");

            // At this point, the information flows as expected.
        } catch(err) {
            callProperties.call = false;
            pca = null;
            pcb = null;
            // TODO ERROR!!!
            console.error(err);
        }
    }
}