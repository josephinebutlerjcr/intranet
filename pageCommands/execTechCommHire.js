const fs = require("fs");
const config = require("../config.json")
//const { getItem, putItem, scanItems } = require("../auxilliaryFunctions/dynamodb"); // database
//const {uploadImageJpeg,getS3Item,putS3Item,listDirectoryFiles,deleteS3Item} = require("../auxilliaryFunctions/s3"); // storage system for other binaries
//const {sendEmail} = require("../auxulliaryFunctions/email"); // self-explanatory
const {parseBody/*, getTime, generateToken*/} = require("../auxilliaryFunctions/formatting");

// main
module.exports = {
    name: "GET/exec/techhire",
    description: "Exec's Tech Hire Portal",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // ONLY use for POST requests via HTML form:
        // const inputBody = await parseBody(event.body);

        // do explore around the assets folder
        // e.g. \assets\elements\squareUpload.html can be fs read, and injected into the HTML template you return - if you have a form to upload an image and need it cropped to a square - for example
        // additionally:
        // to send email: await sendEmail(to,from,htmlBody,subject,replyTo)
        // use config.fromEmail - replyTo either config.replytoEmail or just use "tech@butlerjcr.com"
        // to retrieve from database: await getItem(table,key)
        // where table is config.tables.tech and for key you specify {id: [INSERT ID HERE]} - specifically in this object format
        // to put item to database: await putItem(table,item)
        // again,table is config.tables.tech, and item is an object with key "id" being present

        // check your emails for general instruction

        // this assumes HTML output
        // content
        let content = ``
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Tech Hire")
            .replace(/{{pageName}}/g, "Manage Tech Hires")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }

        // this assumes JSON output
        let returnJson = {}

        return{
            body:JSON.stringify(returnJson),
            headers:{"Content-Type":"application/json"}
        }
    }
}