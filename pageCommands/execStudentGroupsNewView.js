const fs = require("fs");
const config = require("../config.json")
const { getItem } = require("../auxilliaryFunctions/dynamodb")

// main
module.exports = {
    name: "GET/exec/groups/new",
    description: "Exec's Student Groups Creation Portal",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin","exec"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // check error prompts
        let errorPrompts = "";
        if(!!event.error){
            errorPrompts = `<h3 style="color:red">${event.error}</h3>`
            event.queryStringParameters = {id: event.id}
        }

        // content
        let content = 
        `<button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button> |
        <button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button> |
        <button class="redirect-button" onclick="location.href='/exec/groups'">View All Groups</button>
        
        <section style="display: flex; justify-content: center;">
            <section class="latest-news" style="padding: 3rem 1rem; max-width: 600px; text-align: left;">
                ${errorPrompts}
                <h2 style="text-align: center;">Creating a new group</h2>
                <p>Please note that we only permit A-Z, a-z, 0-9, spaces, and special symbols: ()!'£?&.,- only, and each field is permitted up to 32 characters (unless otherwise specified).</p>
                <form action="/exec/groups/new" method="post">

                    <h3>Basics</h3>
                	<label id="name">Name of Student Group</label>
                    <input type="text" class="inputField" name="name" id="name" autocomplete="off" required pattern="[A-Za-z0-9 ()!'£?&.,\\-]{1,32}">

                    <label id="cat">Category of Student Group</label>
                    <select class="inputField" name="category" id="cat">
                        <option value="society">Society</option>
                        <option value="sport">Sports</option>
                        <option value="committee">Committee</option>
                    </select>

                    <label id="desc">Description of Student Group (max 1024 characters)</label>
                    <textarea class="inputField" name="description" id="desc" autocomplete="off" style="height: 80px;"></textarea>

                    <label for="upload">Upload Society Logo (optional)</label>
                    ${fs.readFileSync("./assets/elements/squareUpload.html").toString()}

                    <!--- NO SOC AWARDS IN CREATION
                    <label id="awards">Society's Awards (one line = one award, maximum 10 awards, each line follows the above rules)</label>
                    <textarea class="inputField" name="awards" id="awards" autocomplete="off" style="height: 80px;"></textarea>--->

                    <h3>People</h3>

                    <p>In this "people" section, provide the CIS codes of people involved in the group's executive. President is the only essential field. If the position is joint between two people, separate the two CIS codes with a comma (,). Enter "abdc12" as a dummy CIS code to remove the field (optional fields only)</p>

                    <label id="preident">(Co-)President / Chair(s)</label>
                    <input type="text" class="inputField" name="president" id="president" autocomplete="off" required pattern="[a-zA-Z]{4}\\d{2}(,[a-zA-Z]{4}\\d{2})?">

                    <label id="vicepresident">(Co-)Vice-President / Vice-Captain(s) (optional)</label>
                    <input type="text" class="inputField" name="vicepresident" id="vicepresident" autocomplete="off" pattern="[a-zA-Z]{4}\\d{2}(,[a-zA-Z]{4}\\d{2})?">

                    <label id="treasurer">(Co-)Treasurer(s) (optional)</label>
                    <input type="text" class="inputField" name="treasurer" id="treasurer" autocomplete="off" pattern="[a-zA-Z]{4}\\d{2}(,[a-zA-Z]{4}\\d{2})?">

                    <label id="socialsec">(Co-)Social Secretar(y/ies) (optional)</label>
                    <input type="text" class="inputField" name="socialsec" id="socialsec" autocomplete="off" pattern="[a-zA-Z]{4}\\d{2}(,[a-zA-Z]{4}\\d{2})?">

                    <!--- NO EVENTS IN CREATION
                    <h3>Events</h3>
                    <p>Work in Progress</p>--->

                    <h3>Social Media</h3>
                    <label id="instagram">Instagram Handle (optional; omitting the @)</label>
                    <input type="text" class="inputField" name="instagram" id="instagram" autocomplete="off" pattern="[a-zA-Z0-9\\-_\\.]{1,28}"> <!--patern is instagram's regex-->

                    <label id="whatsapp">WhatsApp Chat Link (optional; valid group chat link)</label>
                    <input type="url" class="inputField" name="whatsapp" id="whatsapp" autocomplete="off" pattern="https:\\/\\/chat\\.whatsapp\\.com\\/[a-zA-Z0-9]{22}"> <!--Whatsapp Link: note serverside theres \\ instead of \ - this is because we must escape \\-->

                    <!--- NOT IN USE
                    <label id="facebook">Facebook Link (optional; valid group chat / page link)</label>
                    <input type="url" class="inputField" name="facebook" id="facebook" autocomplete="off" pattern="https:\/\/(www\\.)?facebook\\.com\\/(groups\\/[a-zA-Z0-9.\-_]+\\/?|[a-zA-Z0-9.\-_]+\\/?|profile\\.php\\?id=\\d+)">
                    --->

                    <input type="submit" class="inputSubmit" value="Create Student Group">
                </form>
            </section>
        </section>`
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "New Group")
            .replace(/{{pageName}}/g, "Create a Student Group")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}