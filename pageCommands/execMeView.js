const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3")

// main
module.exports = {
    name: "GET/exec/me",
    description: "Exec's Personal View",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // retrieves data in system
        let biographies = {}; let ranks = {};
        try {
            biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
            biographies = JSON.parse(biographies)
            ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
            ranks = JSON.parse(ranks)
        } catch(err) {
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification)
        }

        let content = "";
        let edit = true;
        // content selection on abilities
        if(ranks.webBioPermit.includes(verification.cis) == false){
            edit = false;
        }

        // content starter
        content = `<div><h2>Currently Held Details</h2>`

        // gets content
        let myFile = biographies[verification.cis];
        if(!myFile){
            content += `<p>No Record</p>`
        } else {
            content += `<p><b>Bio</b><br>${myFile.bio.replace(/\n/g,"<br>")}<br><br><b>Avatar:</b></p>`
            if(myFile.avatar){
                content += `<img src="https://butler-jcr-public.s3.eu-west-2.amazonaws.com/avatars/${verification.cis}.jpg" width="250" height="250">`
            } else {
                content += `<p>(No Avatar)</p>`
            }
        }

        // edits
        content += `<h2>Edit My Details</h2>`
        if(edit == false){
            content += `<p>You are not eligible to edit any details, as your photo / bio is not displayed to anyone</p>`
        } else {
            content += `<p>Leave blank to not change what is currently available.</p>
            <form action="/exec/me" method="post">
            <label id="desc">Bio (max 2048 characters - A-Z, a-z, 0-9, spaces, new lines and the following special symbols are permitted only: ()!'£?&.,-)</label>
            <textarea class="inputField" name="description" id="desc" autocomplete="off" style="height: 80px;"></textarea>

            <label for="upload">Upload Avatar</label>
            ${fs.readFileSync("./assets/elements/squareUpload.html").toString()}

            <input type="submit" class="inputSubmit" value="Submit Changes">
            </form>`
        }

        content += "</div>"
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Your Details")
            .replace(/{{pageName}}/g, "Your Exec Details")
            .replace(/{{pageDescriptor}}/g, "As it appears on the 'Whose Who' pages")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}