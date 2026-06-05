const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3")

// main
module.exports = {
    name: "GET/admin/registry/roll",
    description: "Admin way to view the full roll of members",
    execute: async(event, verification) => {
        // accesss
        if(verification.privilege != "admin"){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // current roll
        let currentRoll = "";
        try {
            let tmpHash = await getS3Item(config.buckets.operational, config.operationalLocations.collegeMembersHashedCisCodes);
            currentRoll = tmpHash.toString();
        } catch(err){
            console.log(err)
            currentRoll = "**ERROR RETRIEVING CURRENT ROLL, PLEASE TRY AGAIN LATER**"
        }

        // content
        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button>

        <section style="display: flex; justify-content: center;">
            <section class="latest-news" style="padding: 3rem 1rem; max-width: 600px; text-align: left;">
                <p><b>Warning.</b> You need to keep this up to date, ideally once per year for Freshers Week. The JCR President or FACSO must get a list of all college member's CIS codes. They must then encrypt it, and replace all of the current encrypted roll with the new roll. The guide is available on <a href="http://manuals.butlerjcr.com/admin/">manuals.butlerjcr.com/admin</a> under "Encryption: CIS Codes". You can remove everything in the box by clicking on it, Ctrl+A, and then pressing backspace.</p>

                <form action="/admin/registry/roll" method="post">
                    <label id="roll">Student Roll - <b>should be a direct copy from the encryption tool provided</b></label><br>
                    <textarea class="inputField" name="roll" id="roll" autocomplete="off" style="height: 100px; width: 100%">${currentRoll}</textarea>

                    <br>
                    <label id="declaration">I confirm that I know what I am doing, and would like to replace the student roll with what I have just provided.</label>
                    <select class="inputField" name="declaration" id="declaration">
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>

                    <input type="submit" class="inputSubmit" value="Submit Changes">
            </form>
            </section>
        </section>`

        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Member Roll")
            .replace(/{{pageName}}/g, "Member Roll")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}