const fs = require("fs");
const { getTime } = require("../auxilliaryFunctions/formatting");

// main
module.exports = {
    name: "GET/account",
    description: "User's Account",
    execute: async(event, verification) => {
        let content = `<section style="display: flex; justify-content: center;"><section class="latest-news" style="padding: 0; margin-top: 0; max-width: 600px; text-align: left;">
        <button class="redirect-button" onclick="location.href='/'">Back to Dashboard</button>
        <h2>Your Details</h2>
<p><b>Remark.</b> If you are on the executive, you will be able to edit your bio, and avatar, and view what it is, on the exec editor</p>
<p>
    <b>Name:</b> ${verification.name || "{None On Record}"}<br>
    <b>CIS Code:</b> ${verification.cis}<br>
    <b>Account Generated:</b> ${new Date(verification.generated ? verification.generated * 1000 : getTime() * 1000).toLocaleString('en-GB')}<br>
    <b>Membership:</b> ${verification.membership || "No Record"}<br>
    <b>System Privileges:</b> ${verification.privilege}<br>
    <b>Your current session expires:</b> ${new Date(verification.token.exp ? verification.token.exp * 1000 : getTime() * 1000).toLocaleString('en-GB')}
</p>
<div>
    <form action="/account" method="post">
        <h2>Edit Your Name</h2>
        <label id="name">Your Preferred Name (max 48 characters - A-Z, a-z (and with diacritics), spaces, special symbols: -' only)</label>
        <input id="name" class="inputField" autocomplete="off" name="name" type="text" value="${verification.name || ""}" required>
        <input type="submit" class="inputSubmit" value="Submit Changes">
    </form>
</div>
</section>`
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Your Details")
            .replace(/{{pageName}}/g, "Your Details")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}