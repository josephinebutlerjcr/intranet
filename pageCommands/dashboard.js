const fs = require("fs");

// main
module.exports = {
    name: "GET/",
    description: "Dashboard",
    execute: async(event, verification) => {
        // some config on default items
        let panels = [
            {
                name: "Societies, Committees & Sports",
                desc: "Want to see what college-based stuff already exists? Fear not, you can find out here. If you can't find a society you want, please feel free to contact the societies officer or the JCR president to see how you can start one!",
                link: "/groups",
                linkName: "Student Groups"
            },
            {
                name: "Whose Who?",
                desc: "So many names and faces, it would certainly help to know who is on the JCR executive, or holds other roles representing you",
                link: "/people",
                linkName: "JCR Representatives"
            },
            {
                name: "College Families",
                desc: "Are you part of a college family and want to know about your college family? Fear not, you can find out here*",
                link: "/family",
                linkName: "College Families"
            },
            {
                name: "Member Registry",
                desc: "Want to find out what information we hold about you on this portal?",
                link: "/account",
                linkName: "Registry"
            },
            {
                name: "Democracy",
                desc: "All democracy-related articles, from JCR meeting minutes, to our standing orders.",
                link: "/democracy",
                linkName: "Democratic Services"
            }
        ]

        // adds permissions for exec / admin
        if(["exec","chair","admin"].includes(verification.privilege)){
            panels.push({
                name: "Exec's Portal",
                desc: "<b>Exec / Admin Exclusive</b>: Societies Registration, Edit Personal Profile",
                link: "/exec",
                linkName: "Exec's Portal"
            })
        }

        // generate panels
        let panelsToHtml = "";
        for(var i = 0; i < panels.length; i++){
            let currentPanel = panels[i];
            panelsToHtml += `<div class="card"><h3>${currentPanel.name}</h3><p>${currentPanel.desc}</p><a href="${currentPanel.link}">${currentPanel.linkName} →</a></div>`;
        }

        // main content
        let content = 
        `<p>
            This useful website contains all the information you may need to access as a current member of the college, or an alumni. 
            <br>It is recommended you bookmark this page.
            <br>Once you log in, you will stay logged in for 26 weeks, unless you log out, or sign in from another device.
        </p>
        <br>
        <div class="grid-section">
        ${panelsToHtml}
        </div>
        <p style="font-size: small; text-align: left;">* For data protection, available only to those who were college children onwards from those matriculating in Michaelmas 2025, and their parents. No data is held before then.</p>`

        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Welcome")
            .replace(/{{pageName}}/g, "Welcome to the Intranet!")
            .replace(/{{pageDescriptor}}/g, "More information, relevant to members of Josephine Butler College - both JCR/MCR and non-JCR/MCR")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}