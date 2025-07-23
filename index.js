// preamble - get command file names and mappings
const fs = require("fs");
let commandArray = fs.readdirSync("./pageCommands/").filter(file => file.endsWith(".js"));
let cmds = {};
for(let file of commandArray){
    let tmp = require(`./pageCommands/${file}`);
    cmds[tmp.name] = tmp;
}

module.exports.handler = async (event) => {
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
    
    return resp
}