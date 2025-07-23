const fs = require("fs");

module.exports = {
    name: "GET/auth/login/continue",
    description: "Login - second page asking for login code",
    execute: async(event, verification) => {

        // no CIS code provided = go back
        if(!event.cis){
            const loginPage = require("./authLoginMainGet");
            return await loginPage.execute(event, verification);
        }

        // general
        let errorMsg = "";
        if(!!event.error){
            errorMsg = `<br><span style="color: red">${event.error}</span>`
        }

        let resp = fs.readFileSync("./assets/html/loginPage.html").toString()
            .replace(/{{mainText}}/g, "Continue Log In")
            .replace(/{{sideText}}/g, `Hello, ${event.cis} - we sent you an email with a 6 digit code (which expires in 15 minutes). Please could you enter it below? Alternatively, <a href="/auth/login">restart the sign in process</a>`)
            .replace(/{{inputPlaceholder}}/g, "6 digit code, e.g. 123456")
            .replace(/{{continuationMessage}}/g, "Log In")
            .replace(/{{action}}/g, "/auth/login/continue")
            .replace(/{{code}}/g, event.cis)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}