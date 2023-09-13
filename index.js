const ws = require("ws");
const request = require("request");
const uuid = require("uuid");
const prompt = require('prompt-sync')({ sigint: true });
require('dotenv').config();

/// Gamemode Imports Start
const Quiplash3 = require("./gamemodes/quiplash3")
// const MadVerseCity = require("./gamemodes/madversecity")
/// Gamemode Imports End

const delay = ms => new Promise(res => setTimeout(res, ms));

class JackboxGPT {
    constructor(code, games={}) {
        this.uuid = uuid.v4();
        this.name = "CHATGPT"
        this.code = code
        this.checkRoom(code);
        this.connected = false;
        this.clientData = {};
        this.seq = 0;
        this.lastOk = 0;
        this.gameHandlers = games
    };

    checkRoom(code) {
        request(`https://ecast.jackboxgames.com/api/v2/rooms/${code}`, function (error, response, body) {
            if (error) { throw error; } else {
                body = JSON.parse(body);
                if (!body.ok || !this.gameHandlers[body.body.appTag]) { this.connected = null; return; };
                this.connected = true;
                this.roomData = body.body;
                this.connect();
            };
        }.bind(this));
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
        this.ws.onopen = (event) => { console.log("WebSocket Opened") };
        this.ws.onclose = (event) => { console.log("WebSocket Closed") };
        this.ws.onmessage = this.message.bind(this);
        this.gameHandlers[this.roomData.appTag].connect(this);
    };

    message(event) {
        if (!this.connected) return false;
        var msg = JSON.parse(event.data);
        if (msg.opcode == "client/welcome") { // Only when client connects afaik
            this.clientData = msg.result;
            setInterval(this.randomizeCharacter.bind(this), 1000);
            return;
        };
        this.gameHandlers[this.roomData.appTag].message(msg)
        switch (msg.opcode) {
            case "object":
                switch (msg.result.key) {
                    case "room":
                        this.roomState = msg.result.val;
                        break;
                };
                break;
            case "ok":
                this.lastOk = Date.now();
                break;
            case "error":
                console.error(msg.result);
                break;
        };
    };

    randomizeCharacter() {
        if (!this.connected || !this.roomState) return false;
        if (this.roomState.state == "Lobby" && this.roomState.characters) {
            var choose = this.roomState.characters.filter((character) => character.available);
            var selected = choose[Math.floor(Math.random() * choose.length)];
            this.gameHandlers[this.roomData.appTag].send("client/send", { action: "avatar", name: selected.name });
        };
    };

}

new Quiplash3

var agent = new JackboxGPT(prompt("Room Code: ").toUpperCase(), {
    quiplash3: new Quiplash3,
    // rapbattle: new MadVerseCity
});
