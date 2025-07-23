const fs = require("fs");

module.exports = {
    name: "GET/404",
    description: "404 not found",
    execute: async(event, verification) => {
        let resp = fs.readFileSync("./assets/html/404.html").toString()

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}