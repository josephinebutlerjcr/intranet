const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3");

const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

// main
module.exports = {
    name: "GET/exec/me",
    description: "Exec's Personal View",
    execute: async(event, verification) => {
        let cisToUse = verification.cis;

        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // checks for overrides, for admin
        if(verification.privilege == "admin" && !!event.queryStringParameters){
            if(!!event.queryStringParameters.id && /^[a-z]{4}[0-9]{2}$/.test(event.queryStringParameters.id)){
                cisToUse = event.queryStringParameters.id;
            }
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
        /*// content selection on abilities
        if(ranks.webBioPermit.includes(cisToUse) == false){
            edit = false;
        }*/ // removed this logic - literally only applies to webmaster

        // remarks for other edit
        let cisRemark = ""
        if(verification.cis != cisToUse){
            cisRemark = `<br><b style="color:red;">Warning.</b> You are looking at ${cisToUse} - not your own user.`
        }

        // content starter
        content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button>
        ${cisRemark}
    <section style="display: flex; justify-content: center;"><section class="latest-news" style="padding: 0; margin-top: 0; max-width: 600px; text-align: left;">
    <br><br>
    <h2>Currently Held Details</h2>`

        // gets content
        let myFile = biographies[cisToUse];
        if(!myFile){
            content += `<p>No Record</p>`
        } else {
            content += `<p style="text-align: justify;">
            <b>Preferred Name</b><br>${myFile.name || ""}<br><br>
            <b>Bio</b><br>${md.render(myFile.bio || "").replace(/\n/g,"<br>").replace(/<p>/g,"").replace(/<\/p>/g,"")}<br><br>
            <b>Avatar:</b></p>`
            if(myFile.avatar){
                content += `<img src="https://butler-jcr-public.s3.eu-west-2.amazonaws.com/avatars/${cisToUse}.jpg" width="250" height="250">`
            } else {
                content += `<p>(No Avatar)</p>`
            }
        }

        // edits
        content += `<h2>Edit My Details</h2>`
        if(edit == false){
            content += `<p>You are not eligible to edit any details, as your photo / bio is not displayed to anyone</p>`
        } else {
            if(!myFile){myFile = {}}
            content += `<p>Leave blank to not change what is currently available.</p>
            <form action="/exec/me" method="post">
            <label id="name">Preferred Name (max 48 characters - A-Z, a-z (and with diacritics), spaces, special symbols: -')
            <input id="name" name="name" autocomplete="off" class="inputField" value="${(myFile.name || "")}">

            <label id="desc">Bio (max 2048 characters - A-Z, a-z, 0-9, spaces, new lines and the following special symbols are permitted only: ()!'£?&.,-/@:[] - links can be added using markdown.)</label>
            <textarea class="inputField" name="description" id="desc" autocomplete="off">${(myFile.bio || "")}</textarea>

            <label for="upload">Upload Avatar</label>
            ${fs.readFileSync("./assets/elements/squareUpload.html").toString()}

            <p>Want to remove your avatar? Well, I became too busy to make it into a feature. Just upload something like <a href="https://butler-jcr-public.s3.eu-west-2.amazonaws.com/sabbs/2006Mole.jpg" target="_blank">the mole</a> (which is what shows by default anyway if there was never an avatar)</p>

            <input type="hidden" value="${cisToUse}" name="cis">

            <input type="submit" class="inputSubmit" value="Submit Changes">
            </form>`
        }

        content += "</section></section>"
        
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