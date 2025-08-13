const fs = require("fs");
const { putItem } = require("../auxilliaryFunctions/dynamodb");
const config = require("../config.json")

module.exports = {
    name: "GET/auth/logout",
    description: "Log Out - self explanatory",
    execute: async(event, verification) => {
        const loginPage = require("./authLoginMainGet")

        // destroy token
        verification.token = {
            exp: -1,
            key: ""
        }
        await putItem(config.tables.users,verification);

        // passback
        event.error = "Successfully Logged You Out"
        let resp = await loginPage.execute(event, {})
        resp.headers["Set-Cookie"] = `token=null;expires=0;Path=/;Secure;`

        return resp;
    }
}