const { getItem } = require("./dynamodb")
const config = require("../config.json")

module.exports = {
    execute: async(event) => {
        // extract cookie
        if(!event.headers){return false}
        if(!event.headers.cookie){return false}
        let cookies = event.headers.cookie.split("; ");
        let token = "";
        for(var i = 0; i < cookies.length; i++){
            if(cookies[i].includes("token=")){
                token = cookies[i].replace(/token=/g,"");
            }
        }
        if(!token){return false}

        // reverse engineer
        let tokenParts = token.split("-");
        let user = await getItem(config.tables.users,{cis:tokenParts[0]});
        if(!user){return false};
        if(!user.token){return false};

        const d = new Date();
        const timeNow = Math.round(d.getTime() / 1000);

        if(!user.token.exp || timeNow > user.token.exp){return false}
        if(!user.token.key || user.token.key != tokenParts[1]){return false}

        return user;
    }
}