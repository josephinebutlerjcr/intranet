const fs = require("fs");

// main
module.exports = {
    name: "GET/admin/registry",
    description: "Admin way to add members",
    execute: async(event, verification) => {
        // accesss
        if(verification.privilege != "admin"){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button><p>Sorry, you must ask the webmaster (<a href=\"mailto:butlerwebmaster@durham.ac.uk\">butlerwebmaster@durham.ac.uk</a>) to do so manually as this is still a work in progress - to edit information, or as an override to add someone new. <a href="/exec">Click here</a> to go back.</p>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Member Registry")
            .replace(/{{pageName}}/g, "Member Registry")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}