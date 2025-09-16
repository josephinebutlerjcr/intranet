const fs = require("fs");
const {listDirectoryFiles, getS3Item} = require("../auxilliaryFunctions/s3")
const config = require("../config.json")

// main
module.exports = {
    name: "GET/admin/emailer",
    description: "Emailer to Exec / Societies about updates",
    execute: async(event, verification) => {
        // accesss
        if(verification.privilege != "admin"){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }
        
        // main content
        let content = `<button class="redirect-button" onclick="location.href='/exec'">Executive's Dashboard</button><div style="max-width: 800px; margin: 0 auto; text-align: left;">
  <h2>Emailer</h2>
  <p>
    This page is the way for you to send a pre-determined email to new or existing exec members for student groups, and the main thing.
    You are able to email either everyone, or email a particular list of people. For student groups, only their presidents will get emailed.
    <br><br>
    Below are different letters. Note that sections may be removed / changed to make sense for the individual (personalised).
  </p>

  <!-- Letter 1 -->
  <h3>Letter 1: New Academic Year</h3>
  <p>Subject Line: <b>Important: Your Help for the JCR Website ([cisCode], [year])</b></p>
  <p>Suggested to be sent to all users towards the beginning of the academic year, rather than targetted.</p>
  <div style="font-family: 'Times New Roman', Times, serif; border: 1px solid black; padding: 16px; border-radius: 8px;">
    <p>
      Hello, as we enter a new academic year, we ask that you help us to keep the website up to date. You are receiving this email,
      either as a member of the JCR exec, or a named president for a student group, or perhaps both!
    </p>

    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>

    <p>
      We have noticed that you are listed as the <b>RoleName</b> for the JCR Exec. We therefore request for you to keep your exec profile up to date.
      This is the (optional) preferred name, avatar, and bio which are shown to anyone who can access the intranet (i.e. members of the college).
      You can do so by:
    </p>
    <ol>
      <li>Logging into the intranet</li>
      <li>On the dashboard that appears, choosing the 'Exec's Portal' card</li>
      <li>On this dashboard, choosing the 'Your Profile' card</li>
      <li>Following the intuitive process in reviewing, and updating your information</li>
    </ol>

    <p>
      We have noticed that you are listed as the (co-)president of at least one student group. Those being:
    </p>
    <ul>
      <li>Butler Slacklining (<a href="https://josephine.butlerjcr.com/groups?id=soc-butler-slacklining">Intranet View</a>)</li>
    </ul>
    <p>
      We therefore request that you update the description, any events, the exec, social media, and the logo of the student group, 
      if it is not correct. This includes handing access off to another person, should they be the new president of the student group.
      To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to 
      "Edit Society" (button at the top), and edit the details of the society should they be incorrect.
    </p>

    <p>
      If you have any problems, please contact the webmaster at <a href="mailto:butlerwebmaster@durham.ac.uk">butlerwebmaster@durham.ac.uk</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by {{cisCode}}
    </p>
  </div>

  <!-- Letter 2 -->
  <h3>Letter 2: Handovers</h3>
  <p>Subject Line: <b>Handovers: Tell Us About Your Society's Exec ([cisCode])</b></p>
  <p>Suggested to be sent to all users towards the end of the academic year, rather than targetted. It will not be sent to exec members,
  unless they are the (co-)president of at least one student group.</p>
  <div style="font-family: 'Times New Roman', Times, serif; border: 1px solid black; padding: 16px; border-radius: 8px;">
    <p>
      Hello, as we end the current academic year, we ask that you help us to keep the website up to date. You are receiving this email,
      as a named president for a student group.
    </p>

    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>

    <p>
      We have noticed that you are listed as the (co-)president of at least one student group. Those being:
    </p>
    <ul>
      <li>Butler Slacklining (<a href="https://josephine.butlerjcr.com/groups?id=soc-butler-slacklining">Intranet View</a>)</li>
    </ul>
    <p>
      We therefore request that you review the student group's exec, and update it if there has been changes, or will be after an AGM,
      so please keep this in mind for after your term in your society exec has ended / is ending.
      To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to 
      "Edit Society" (button at the top), and edit the details of the society should they be incorrect.
    </p>

    <p>
      If you have any problems, please contact the webmaster at <a href="mailto:butlerwebmaster@durham.ac.uk">butlerwebmaster@durham.ac.uk</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by {{cisCode}}
    </p>
  </div>

  <!-- Letter 3 -->
  <h3>Letter 3: Target Newbies</h3>
  <p>Subject Line: <b>Welcome: Butler JCR Website ([cisCode])</b></p>
  <p>Suggested to be sent to targetted CIS codes, either as new exec members, or new soc admins (by virtue of the student group being ratified mid-year)</p>
  <div style="font-family: 'Times New Roman', Times, serif; border: 1px solid black; padding: 16px; border-radius: 8px;">
    <p>
      Hello, and welcome to Butler JCR. This email has been triggered manually, as you have recently become a member on the JCR exec,
      or as you have become a society president.
    </p>

    <p>
      We request you make changes through the intranet. You may do so by logging in to 
      <a href="https://josephine.butlerjcr.com">josephine.butlerjcr.com</a>, entering your CIS code, and waiting for an email with a 
      6-digit code to log in. This process should be intuitive - even for those who have never accessed it before!
    </p>

    <p>
      We have noticed that you are listed as the <b>RoleName</b> for the JCR Exec. We therefore request for you to keep your exec profile up to date.
      This is the (optional) preferred name, avatar, and bio which are shown to anyone who can access the intranet (i.e. members of the college).
      You can do so by:
    </p>
    <ol>
      <li>Logging into the intranet</li>
      <li>On the dashboard that appears, choosing the 'Exec's Portal' card</li>
      <li>On this dashboard, choosing the 'Your Profile' card</li>
      <li>Following the intuitive process in reviewing, and updating your information</li>
    </ol>

    <p>
      We have noticed that you are listed as the (co-)president of at least one student group. Those being:
    </p>
    <ul>
      <li>Butler Slacklining (<a href="https://josephine.butlerjcr.com/groups?id=soc-butler-slacklining">Intranet View</a>)</li>
    </ul>
    <p>
      We therefore request that you review the student group's exec, and update it if there are discrepencies, or if it is a new student group,
      so you need to add data in!
      To do this, you can log into the intranet, and find the student group. The link(s) above give you quick access. You are then able to 
      "Edit Society" (button at the top), and edit the details of the society should they be incorrect.
    </p>

    <p>
      If you have any problems, please contact the webmaster at <a href="mailto:butlerwebmaster@durham.ac.uk">butlerwebmaster@durham.ac.uk</a> - or alternatively the JCR President at 
      <a href="mailto:butler.jcr@durham.ac.uk">butler.jcr@durham.ac.uk</a> (should there not be a Webmaster).
      Please do so by replying / forwarding this email, ensuring the webmaster / president is added into the email, 
      as this email has information which can help them solve the issue.
    </p>

    <p>
      Best,<br>
      Webmaster
    </p>

    <hr>

    <p>
      Josephine Butler Junior Common Room CIO<br>
      This message has been automatically generated.<br>
      Initialised by {{cisCode}}
    </p>
  </div>

  <h2>Send Email</h2>
  <form action="/admin/emailer" method="post">
    <label for="letter">Choose Letter:</label><br>
    <select name="letter" id="letter" class="inputField">
        <option value="form1">Letter 1 - New Academic Year</option>
        <option value="form2">Letter 2 - AGM Season</option>
        <option value="form3">Letter 3 - Targetted for New People</option>
    </select>
    <br><br>

    <label>Send to:</label><br>
    <input type="radio" name="sendType" value="all" id="sendAll" checked>
    <label for="sendAll">All (Recommended for Letter 1 and Letter 2. NOT for Letter 3)</label><br>
        <br>
    <input type="radio" name="sendType" value="particular" id="sendParticular">
    <label for="sendParticular">Particular Users</label>
    <br><br>

    <div id="cisBox" style="display:none;">
        <label for="cisCodes">Enter CIS Codes (one per line):</label><br>
        <textarea name="cisCodes" id="cisCodes" rows="6" cols="40" class="inputField"></textarea>
    </div>
    <br>

    <input type="submit" value="Send Email" class="inputSubmit">

    </form>

    <script>
    document.getElementById('sendParticular').addEventListener('change', function () {
        document.getElementById('cisBox').style.display = 'block';
    });

    document.getElementById('sendAll').addEventListener('change', function () {
        document.getElementById('cisBox').style.display = 'none';
    });
    </script>


</div>`
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Emailer")
            .replace(/{{pageName}}/g, "Emailer")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g,  content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}