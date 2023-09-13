
const himalaya = require('himalaya');
const he = require('he');
require('dotenv').config();
const Template = require("./template")

class Quiplash3 extends Template {
    constructor() {
        super();
        this.promptHistory = [];
        console.log("Quiplash3 Imported");
    }

    message(data) {
        if (data.opcode == "object") {
            switch (data.result.key) {
                case `player:${this.agent.clientData.id}`:
                    switch (data.result.val.state) {
                        case "EnterSingleText":
                            if (!data.result.val.prompt) return;
                            var parsed = himalaya.parse(data.result.val.prompt.html);
                            if (parsed.length == 2 && parsed[1].tagName == "div") {
                                console.log("Generating normal response...");
                                this.generateResponse(parsed[1].children[0].content, false);
                            };
                            break;
                        case "MakeSingleChoice":
                            // This is the only spot the prompt and answers will be gathered since it is known the bot wasn't one of the answers
                            if (data.result.val.choices && data.result.val.choices.length == 2 && data.result.val.choices[0] && data.result.val.choices[1] && Date.now() - this.agent.lastOk >= 250) {
                                if (himalaya.parse(data.result.val.choices[0].html)[0].content) {
                                    var choice1 = he.decode(himalaya.parse(data.result.val.choices[0].html)[0].content);
                                    var choice2 = he.decode(himalaya.parse(data.result.val.choices[1].html)[0].content);
                                    console.log(choice1);
                                    console.log(choice2);
                                    this.promptHistory.push({prompt: he.decode(himalaya.parse(data.result.val.prompt.html)[0].content), answer: choice1});
                                    this.promptHistory.push({prompt: he.decode(himalaya.parse(data.result.val.prompt.html)[0].content), answer: choice2});
                                    this.promptHistory = this.promptHistory.slice(-25);
                                };
                                var choose = Math.floor(Math.random() * 2);
                                this.send("client/send", { action: "choose", choice: choose });
                            };
                            break;
                        case "EnterTextList":
                            var parsed = himalaya.parse(data.result.val.prompt.html);
                            if (parsed.length == 2 && parsed[1].tagName == "div" && Date.now() - this.agent.lastOk >= 250) {
                                console.log("Generating thriplash response...");
                                this.generateResponse(parsed[1].children[0].content, true);
                            };
                            break;
                    };
                    break;
            };
        };
    };

    generateResponse(prompt, thriplash = false) {
        if (!this.agent.connected || !this.agent.roomState) return false;
        var systemPrompt = "You are a bot that needs to take previous prompts and their respective responses and factor it into a new response to the most recent prompt, which will have no answer with it. The previous prompts and answers will be in one message, split by a new line.  Your response should not include anything from a previous prompt, the prompts are there only for context of when that answer is used. Your response should be limited to 45 characters and not repeat the prompt you are answering, it should only be your exact response. Also avoid using any kind of quotes. You should try to use previous answers in your new answer but only if it makes sense in the context of the new prompt.";
        var temp = 1.2;
        var count = 1;
        if (thriplash) { count = 3; systemPrompt = "You are a bot that needs to take previous prompts and their respective responses and factor it into a new response to the most recent prompt, which will have no answer with it. The previous prompts and answers will be in one message, split by a new line, however user answers will be 3 lines long.  Your response should not include anything from a previous prompt, the prompts are there only for context of when that answer is used. Each answer in your response should be limited to 30 characters and not repeat the prompt you are answering, it should only be your exact response. Also avoid using any kind of quotes. You should try to use previous answers in your new answer but only if it makes sense in the context of the new prompt. You should generate one answer for each of the three lines, and have only answer split by a new line character."; temp = 0.7; }; // Nothing yet
        var data = [{ role: "system", content: systemPrompt }];
        if (this.promptHistory.slice(-25).forEach((val) => { return val.prompt + "\n" + val.answer })) { data = data.concat(this.promptHistory.slice(-25).forEach((val) => { return val.prompt + "\n" + val.answer })) };
        data = data.concat([{ role: "user", content: prompt }]);
        console.log("Generating response...")
        request("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + process.env.KEY
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: data,
                temperature: temp,
                n: count
            })
        }, async function (error, response, body) {
            if (error) { console.error(error); return false; };
            body = JSON.parse(body);
            await delay(1000)
            if (body && body.choices && body.choices.length >= 1 && body.choices[0] && body.choices[0].finish_reason == "stop") {
                if (thriplash) {
                    await delay(4000)
                    var success = false
                    for (var choice of body.choices) {
                        var fixed = choice.message.content.replace(/([\n\.] ?\n?)|\\n/gm, "\n").replace(/\n$/gm, "").replace(/["`]/gm, "")
                        if (fixed.split("\n").length <= 3) { success = true; break; }
                    }
                    console.log(fixed)
                    if (!success) {
                        this.send("text/update", "ChatGPT failed.\nSo sorry.\nBlame OpenAI.");
                    } else {
                        this.send("text/update", fixed);
                    }
                } else {
                    console.log(body.choices[0].message.content.substring(0, 45).replace(/["'`]/, ""))
                    this.send("text/update", body.choices[0].message.content.substring(0, 45).replace(/["'`]/, ""));
                };
            } else {
                if (thriplash) { this.send("text/update", "ChatGPT failed.\nSo sorry.\nBlame OpenAI."); } else {
                    this.send("text/update", "Sorry, an error occurred.");
                };
            };
        }.bind(this));
    };
};

module.exports = Quiplash3;
