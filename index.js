const express = require("express");
const app = express();
const mongoose = require("mongoose");
const UserAuthModel = require("./models/user.model");
const cors = require("cors");
const Youtube = require('youtube-stream-url');
const fs = require("fs")
const bodyParser = require('body-parser');
const webrtc = require("wrtc");

let senderStream;

app.use(cors())
app.use(express.json())
mongoose.connect('mongodb://localhost:27017/Users');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.post("/user_auth", async (req, res) => {
        try {
                const data = new UserAuthModel({
                        firstname : req.body.firstname,
                        lastname : req.body.lastname,
                        email : req.body.email,
                        password : req.body.password
                });
                await data.save();
                res.json({ status : 'ok' })
        } catch (err) {
                res.json({ status : "err" })
        }
});

app.post("/login", async (req, res) => {
        const user = await UserAuthModel.findOne({
                email : req.body.email,
                password : req.body.password
        });

        if (user) {
		return res.json({ status: "ok" })
        } else {
                return res.json({ status: "err"})
        }
});

app.use("/videoplay", async (req, res) => {
        const id = req.body.id;
        console.log(id)
        const data = await Youtube.getInfo({url: `https://www.youtube.com/watch?v=${id}`});
        return res.send({
                "data" : data.formats[1]
        });
})


app.post("/consumer", async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

app.post('/broadcast', async ({ body }, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.stunprotocol.org"
            }
        ]
    });
    peer.ontrack = (e) => handleTrackEvent(e, peer);
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];
};

app.use("/", (req, res) => {
        res.send("<h1>Hello World</h1>");
});

app.listen(3000);