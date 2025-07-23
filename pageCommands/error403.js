const fs = require("fs");

module.exports = {
    name: "GET/403",
    description: "403 forbidden",
    execute: async(event, verification) => {
        let resp = fs.readFileSync("./assets/html/403.html").toString()

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}