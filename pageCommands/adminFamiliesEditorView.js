const fs = require("fs");

// main
module.exports = {
    name: "GET/admin/families",
    description: "Admin way to add families",
    execute: async(event, verification) => {
        // accesss
        if(verification.privilege != "admin"){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button><p>Sorry, you must ask the webmaster to do so manually as this is still a work in progress. <a href="/exec">Click here</a> to go back.</p>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Families Editor")
            .replace(/{{pageName}}/g, "Families Editor")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}