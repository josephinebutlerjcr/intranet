function parseBody(body){
    let final = {};
    // splits to lines
    let lines = body.split("&");
    for(var i = 0; i < lines.length; i++){
        // formats each line, unescapes characters
        let temp = lines[i].split("=");
        let key = unescape(temp[0]).replace(/\+/g," ");
        let value = unescape(temp[1]).replace(/\+/g," ").replace(/\r/g,"");
        if(typeof final[key] != "undefined"){
            if(!Array.isArray(final[key])){
                final[key] = [final[key]];
            }
            final[key].push(value);
        } else {
            final[key] = value;
        }
    }
    return final
}

function getTime(){
    // gets current time, in seconds since 01/01/1970 midnight (unix time)
    const date = new Date();
    let timeMilliseconds = date.getTime();
    return Math.floor(timeMilliseconds / 1000);
}

function generateToken(){
    // generates 32 character long hexadecimal string
    let token = "";
    for(var i = 0; i < 32; i++){
        let tmp = Math.floor(Math.random() * 16);
        token += tmp.toString(16);
    }
    return token;
}

module.exports = {parseBody, getTime, generateToken}