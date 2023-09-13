const ws = require("ws");
const request = require("request");
const uuid = require("uuid");
const prompt = require('prompt-sync')({sigint: true});

const names = ["BIGDADDY", "COOLEST", "TITAN", "JACKLE", "STEPE", "JULEN", "PAPA", "BABY", "SLAYER", "SLASH", "LASHER", "JOKER"]

class JackboxGPT {
    constructor(code) {
        this.uuid = uuid.v4();
        this.name = names[Math.floor(Math.random()*names.length)]
        this.code = code
        this.checkRoom(code);
        this.connected = false
    };

    checkRoom(code) {
        request(`https://ecast.jackboxgames.com/api/v2/rooms/${code}`, function (error, response, body) {
            if (error) { throw error; } else {
                body = JSON.parse(body);
                if (!body.ok) { this.connected = null; return; };
                this.connected = true;
                this.roomData = body.body;
                this.connect();
            };
        }.bind(this))
    };

    connect() {
        if (!this.connected) return false; // Show some sign of failure.. which implies this was called by the user
        console.log(`Attempting connection to "wss://${this.roomData.host}/api/v2/rooms/${this.code}/play?role=player&name=${this.name}&format=json&user-id=${this.uuid}"`);
        this.ws = new ws.WebSocket(`wss://${this.roomData.host}/api/v2/rooms/${this.code}/play?role=player&name=${this.name}&format=json&user-id=${this.uuid}`, "ecast-v0", {
            headers: {
                'Sec-Websocket-Protocol': 'ecast-v0'
            }
        });
        this.ws.onerror = (event) => { console.error(event.error) };
    }
}

var code = prompt("Room Code: ").toUpperCase()
setInterval(function() {
    var agent = new JackboxGPT(code);
}, 500)
