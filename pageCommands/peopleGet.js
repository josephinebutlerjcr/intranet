const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3");

const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

// main
module.exports = {
    name: "GET/people",
    description: "All JCR people",
    execute: async(event, verification) => {
        // gains bio / ranks
        let biographies = {}; let ranks = {};
        try {
            biographies = await getS3Item(config.buckets.operational, `executive/biographies.json`);
            biographies = JSON.parse(biographies)
            ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
            ranks = JSON.parse(ranks)
        } catch(err) {biographies = {}; ranks = {main:{},extra:{},emailOverrides:{}}};

        let content = `<div class="groupCardContainer" id="exec">`

            // goes through exec: main
            let execMainRoles = Object.keys(ranks.main);
            for(let extraRole of Object.keys(ranks.extra)){
              execMainRoles.push(extraRole)
            }
            for(let role of execMainRoles){
                if(role.includes("Webmaster")){continue;} // Webmaster is not an exec role

                // gathers cis - exempts if no cis
                let roleCis = ranks.main[role] || ranks.extra[role];
                if(!roleCis){continue;}

                // bios and stuff
                if(!biographies[roleCis]){biographies[roleCis] = {bio:"",avatar:"",name:""}}
                let email = ranks.emailOverrides[role] || `${roleCis}@durham.ac.uk`;
                let bio = biographies[roleCis].bio;
                let avatar = biographies[roleCis].avatar ? `https://butler-jcr-public.s3.eu-west-2.amazonaws.com/avatars/${roleCis}.jpg` : "https://butler-jcr-public.s3.eu-west-2.amazonaws.com/sabbs/2006Mole.jpg";
                let name = biographies[roleCis].name;

                // gives edit option to admins or self
                let editOption = "";
                if(verification.cis == roleCis){
                  editOption = ` | <a href="/exec/me">Edit Me</a>`
                } else if(verification.privilege == "admin"){
                  editOption = ` | <a href="/exec/me?id=${roleCis}">Edit Person</a>`
                }

                // content card
                content += `<div class="groupCard">
                        <img src="${avatar}" alt="Image of ${name}, or the Butler Mole if not provided">
                        <div class="groupCardBody">
                            <div class="groupName">${role}<br>${name}</div>
                        </div>
                        <div class="groupCardFooter">
                            <div class="bio-preview">
                                ${md.render(bio).replace(/\n/g,"<br>").replace(/<p>/g,"").replace(/<\/p>/g,"")}
                            </div>
                            <button class="toggle-bio-btn">Show more</button>
                            <br><a href="mailto:${email}">Email</a>${editOption}
                        </div>
                    </div>`
            }

            // goes through exec: extra

        content += `</div>
<style>
.bio-preview {
  max-height: 6em;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease;
  text-align: left;
}

.bio-preview.expanded {
  max-height: 1000px;
}

.toggle-bio-btn {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  padding: 0;
  font-size: 0.9em;
}
</style>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    const buttons = document.querySelectorAll('.toggle-bio-btn');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const bio = button.previousElementSibling;
        bio.classList.toggle('expanded');
        button.textContent = bio.classList.contains('expanded') ? 'Show less' : 'Show more';
      });
    });
  });
</script>
`
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "JCR Exec")
            .replace(/{{pageName}}/g, "JCR Exec")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}