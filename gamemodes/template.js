
class Template {
    constructor() {
        this.agent = null;
    };

    send(mode = "client/send", data) {
        if (!this.agent || !this.agent.connected || !this.agent.ws || !this.agent.clientData) return false;
        this.agent.seq++;
        var params = {};
        switch (mode) {
            case "client/send":
                params = { from: this.agent.clientData.id, to: 1, body: data };
                break;
            case "text/update":
                params = { key: `entertext:${this.agent.clientData.id}`, val: data };
                break;
            default:
                params = data // Manual override for formats not listed here
                break;
        };
        this.agent.ws.send(JSON.stringify({ seq: this.agent.seq, opcode: mode, params: params }));
    };

    connect(agent) {
        this.agent = agent;
    }

    connected() {
        console.log("Joined room!");
    }

    message(data) {
        if (!this.agent) return false;
        console.log(`Message recieved! Opcode: ${data.opcode} Key: ${data.result.key}`);
    }
}

module.exports = Template;
