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

        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button>
        
        <section class="intro">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
                <br>
                <div class="grid-section">
                    <div class="card">
                        <i class="fas fa-users" style="font-size: 2.5rem; margin-bottom: 8px; color: #b1333a;"></i>
                        <h3>Student Roll</h3>
                        <p>View the encrypted student roll, and edit.</p>
                        <a href="/admin/registry/roll">Student Roll →</a>
                    </div>
                </div>
            </section>`

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