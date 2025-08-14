const fs = require("fs");

module.exports = {
    name: "GET/exec/democracy/tool",
    description: "Democracy tool for chair: standing order tex to md",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }
        
        let resp = fs.readFileSync("./assets/html/texToMd.html").toString()

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}