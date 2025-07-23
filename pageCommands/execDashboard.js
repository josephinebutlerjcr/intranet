const fs = require("fs");

// main
module.exports = {
    name: "GET/exec",
    description: "Exec's Dashboard",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // extra notes for elevated than exec
        let extras = "";
        if(["chair","admin"].includes(verification.privilege)){
            extras += 
            `<div class="card"><h3>Democracy</h3><p>You are registered to be able to edit / add democracy documents. You may do so from the main democracy page.</p><a href="/democracy">Democracy Page →</a></div>
            <div class="card"><h3>Representatives</h3><p>You are registered to be able to edit the JCR Exec positions.</p><a href="/exec/members">Positions Editor →</a></div>`
        }
        if(["admin"].includes(verification.privilege)){
            extras += 
            `<div class="card"><h3>Families Editor</h3><p>You are registered to be able to edit college families.</p><a href="/admin/families">Families Editor →</a></div>
            <div class="card"><h3>Members Registry</h3><p>Edit the members details.</p><a href="/admin/registry">Registry →</a></div>`
        }
        

        // main content
        let content = 
        `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button>

        <br><br>

        <div class="grid-section">
            <div class="card"><h3>Student Groups' Registry</h3><p>View a full list of student groups (societies; committees; sports), and manage the register.</p><a href="/exec/groups">Groups Registry →</a></div>
            <div class="card"><h3>Your Profile</h3><p>Edit your profile, as it appears to members in the "Whose Who" page (and main website, for sabbs).</p><a href="/exec/me">Edit Me →</a></div>
            ${extras}
        </div>
        
        <br>

        <p>If there are any issues or items to suggest, please report them to the webmaster.</p>`
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Exec Portal")
            .replace(/{{pageName}}/g, "Executive's Portal")
            .replace(/{{pageDescriptor}}/g, "Some management: personal bios and student groups")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}