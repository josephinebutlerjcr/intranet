const { parseBody, getTime, generateToken } = require("../auxilliaryFunctions/formatting")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const config = require("../config.json")

module.exports = {
    name: "POST/auth/login/continue",
    description: "Login - verify the One Time Password",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);
        const loginPageCode = require("./authLoginCodeGet")

        // validation for a CIS
        if(!inputBody.code){
            const loginPage = require("./authLoginMainGet");
            event.error = "Missing CIS code, please re-enter your CIS code.";
            return await loginPage.execute(event, verification)
        }

        // validation checks
        if(!inputBody.inputField){
            event.error = "Missing Fields";
            return await loginPageCode.execute(event, verification);
        }
        let code = inputBody.inputField.trim();
        if(/^[0-9]{6}$/.test(code) == false){
            event.error = "Invalid code, please try again";
            return await loginPageCode.execute(event, verification);
        }
        
        // user retrieve
        let user = await getItem(config.tables.users,{cis: inputBody.code});
        if(user.error == true){
            const loginPage = require("./authLoginMainGet");
            event.error = "Unrecognised CIS code. Please re-enter your CIS code again";
            return await loginPage.execute(event, verification)
        }

        // number of tries test
        if(user.login.attemptsOnCode >= 3){
            event.error = `You have put in 3 incorrect codes. Please generate a new code <a href="/auth/login">by restarting the process</a>`;
            return await loginPageCode.execute(event, verification)
        }

        // expiry
        if((user.login.generated + 15*60) < getTime()){
            event.error = `This code is more than 15 minutes old. Please generate a new code <a href="/auth/login">by restarting the process</a>`;
            return await loginPageCode.execute(event, verification)
        }

        // comparison of the code
        if(user.login.code != code){
            user.login.attemptsOnCode += 1;
            await putItem(config.tables.users,user);
            if(user.login.attemptsOnCode == 3){
                event.error = `Incorrect Code. You have now put in 3 incorrect codes. Please generate a new code <a href="/auth/login">by restarting the process</a>`;
            } else {
                event.error = `Incorrect Code. That was attempt ${user.login.attemptsOnCode}. You have 3 attempts, before you are forced to restart the log in process.`;
            }
            return await loginPageCode.execute(event, verification)
        }
        
        // should be a success now: reset login object
        user.login = {
            code: "",
            generated: -1,
            attempts: 0,
            attemptsOnCode: 0
        }

        // generate a token
        user.token = {
            exp: getTime() + 26*7*24*60*60,
            key: generateToken()
        }

        // put in DB
        await putItem(config.tables.users,user);

        // retrieve a response
        const dashboard = require("./dashboard")
        let resp = await dashboard.execute(event, user);
        resp.body = resp.body.replace(/{{cisCode}}/g, user.cis);

        // send with cookie
        const dateNow = new Date();
        const expiry = new Date(dateNow.getTime() + 26*7*24*60*60*1000);
        resp.headers["Set-Cookie"] = `token=${user.cis}-${user.token.key};expires=${expiry};Path=/;Secure;`
        return resp;
    }
}