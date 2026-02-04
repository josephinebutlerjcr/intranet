// preamble - get command file names and mappings
const fs = require("fs");
let commandArray = fs.readdirSync("./pageCommands/").filter(file => file.endsWith(".js"));
let cmds = {};
for(let file of commandArray){
    let tmp = require(`./pageCommands/${file}`);
    cmds[tmp.name] = tmp;
}

// local testing only
const express = require("express");
const app = express();
const port = 3000;
require("dotenv").config();
app.use(express.text({ type: '*/*', defaultCharset: 'utf-8', limit: "2mb" }));

// main sequence, translated for this use.
app.use(async (req, res) => {
    const event = buildLambdaEvent(req)

    const verifier = require("./auxilliaryFunctions/verification")
    let verification = await verifier.execute(event);

    // verification: unauthenticated and authenticated segregation
    let pageCode = `${event.httpMethod}${event.path}`;
    let permittedUnauthenticated = ["GET/auth/login","POST/auth/login","GET/auth/login/continue","POST/auth/login/continue"]

    if(verification == false && permittedUnauthenticated.includes(pageCode) == false){ // unauthenticated only
        pageCode = "GET/auth/login"
    } else if(verification != false && permittedUnauthenticated.includes(pageCode) == true){ // authenticated only
        pageCode = "GET/"
    }

    // does page exist
    if(Object.keys(cmds).includes(pageCode) == false){
        pageCode = "GET/404"
    }

    // return whatever
    let resp
    try {
        resp = await cmds[pageCode].execute(event, verification)
    } catch(err) {
        console.log(err);
        resp = {
            body: "INTERNAL SERVER ERROR",
            headers:{"Content-Type":"text/plain"}
        }
    }
    if(resp.headers["Content-Type"] == "text/html"){
        resp.body = resp.body.replace(/{{cisCode}}/g, verification.cis);
    }
    
    try {
        res.set("Content-Type", resp.headers["Content-Type"]);
        if(!!resp.headers["Set-Cookie"]){res.set("Set-Cookie", resp.headers["Set-Cookie"])}
        res.send(resp.body);
    } catch (err) {
        res.status(500).send("Internal Server Error");
        console.error(err);
    }
});

app.listen(port, () => {
    console.log(`Local server running at http://localhost:${port}`);
});

// function to mimick the AWS Lambda event, from the express request
function buildLambdaEvent(req) {
    return {
        httpMethod: req.method,
        path: req.path,
        queryStringParameters: req.query,
        headers: req.headers,
        body: Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body,
        isBase64Encoded: false,
        pathParameters: req.params || {},
        requestContext: {
            identity: {
                sourceIp: req.ip
            }
        }
    };
}

