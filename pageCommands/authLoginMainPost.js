const { parseBody, getTime } = require("../auxilliaryFunctions/formatting")
const { sendEmail } = require("../auxilliaryFunctions/email")
const { getItem, putItem } = require("../auxilliaryFunctions/dynamodb")
const { validateButlerCIS } = require("../auxilliaryFunctions/collegeCheck")
const config = require("../config.json")
const fs = require("fs");

module.exports = {
    name: "POST/auth/login",
    description: "Login - page immediately after CIS code",
    execute: async(event, verification) => {
        const inputBody = await parseBody(event.body);
        const loginPage = require("./authLoginMainGet")

        // validation checks
        if(!inputBody.inputField){
            event.error = "Missing Fields";
            return await loginPage.execute(event, verification);
        }
        let cisCode = inputBody.inputField.trim().toLowerCase();
        if(/^[a-z]{4}[0-9]{2}$/.test(cisCode) == false){
            event.error = "Invalid CIS code. A CIS code is in the form abcd12. It is above the barcode on the right, on your campus card.";
            return await loginPage.execute(event, verification);
        }
        
        // user creation / whatever
        let user = await getItem(config.tables.users,{cis: cisCode});
        if(user.error == true){
            let permitted = await validateButlerCIS(cisCode);
            if(permitted == false){
                event.error = "You are not a member of Josephine Butler College. If this is a mistake, please email us, and we can set you up with an account manually. By emailing us regarding this, you agree to the intranet privacy policy.";
                return await loginPage.execute(event, verification);
            }

            user = {
                cis: cisCode,
                generated: getTime(),
                name: "",
                token: {
                    key: "",
                    exp: -1
                },
                login:{
                    code: "",
                    generated: -1,
                    attempts: 0,
                    attemptsOnCode: 0
                },
                privilege: "general",
                membership: "N/R",
                newUser: true
            }
        }

        // user prohibitions
        if(user.login.attempts >= 3 && (user.login.generated + 24*60*60) >= getTime()){
            // more than 3 requests with no login, last one in the past 24 hrs
            event.error = "You have tried to log in more than 3 times in the past 24 hours. Account locked. Try again in 24 hours.";
            return await loginPage.execute(event, verification);
        } else if(user.login.attempts >= 3){
            // it has been more than 24 hours since the last attempt
            user.login.attempts = 0;
        }

        // generation of code
        user.login = {
            code: verCode(6),
            generated: getTime(),
            attempts: user.login.attempts + 1,
            attemptsOnCode: 0
        }

        // put in DB and send email
        await putItem(config.tables.users,user);
        let bodyEmail = fs.readFileSync("./assets/email/otp.html").toString().replace(/{{otp}}/g,user.login.code)
        await sendEmail(
            `${user.cis}@durham.ac.uk`,
            config.fromEmail,
            bodyEmail,
            `${user.login.code} is your verification code`,
            config.replytoEmail
        )

        // go to next step
        event.cis = user.cis;
        const nextPage = require("./authLoginCodeGet");
        return await nextPage.execute(event,verification)
    }
}

function verCode(l){
    let tmp = "";
    for(var i = 0; i < l; i++){
        let nextDigit = Math.floor(Math.random() * (10)).toString();
        tmp = `${tmp}${nextDigit}`
    }
    return tmp;
}