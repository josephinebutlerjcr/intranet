const fs = require("fs");

module.exports = {
    name: "GET/auth/login",
    description: "Login - main page asking for CIS code",
    execute: async(event, verification) => {
        let errorMsg = "";
        if(!!event.error){
            errorMsg = `<br><span style="color: red">${event.error}</span>`
        }

        let resp = fs.readFileSync("./assets/html/loginPage.html").toString()
            .replace(/{{mainText}}/g, "Welcome")
            .replace(/{{sideText}}/g, `This is for the Josephine Butler JCR Intranet. We require a Durham University CIS code to log you in.${errorMsg}`)
            .replace(/{{inputPlaceholder}}/g, "CIS Code, e.g. abcd12")
            .replace(/{{continuationMessage}}/g, "Continue")
            .replace(/{{action}}/g, "/auth/login")
            .replace(/{{code}}/g, "")

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}