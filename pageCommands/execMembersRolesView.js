const fs = require("fs");
const config = require("../config.json")
const { getS3Item } = require("../auxilliaryFunctions/s3");


// main
module.exports = {
    name: "GET/exec/members",
    description: "Exec People Register",
    execute: async(event, verification) => {
        // user access levels
        if(["chair","admin"].includes(verification.privilege) == false){
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event,verification)
        }

        // retrieves data in system
        let ranks = {};
        try {
            ranks = await getS3Item(config.buckets.operational, `executive/roles.json`);
            ranks = JSON.parse(ranks)
        } catch(err) {
            const dashboard = require("./dashboard");
            return await dashboard.execute(event,verification)
        }

        // error prompt
        let errorPrompt = "";
        if(!!event.error){
          errorPrompt = `<p style="color:red">${event.error}</p>`
        }

        let content = `
<style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid black; padding: 8px; }
    .readonly { background-color: #b1333a; color:#f0d954 }
    input[type="text"] { box-sizing: border-box; width: 95%;font-size: 1rem;padding: 0.5rem;border-radius: 4px;margin-bottom: 1rem;border: 1px solid #ccc; }
</style>
<h2>Before You Start</h2>
<p>This service is available to admins and chairs only. Any roles which have a red background are statuatory roles, so can not be removed. You may add roles. If there are more than one person for a role, e.g. 'Welfare Officer', you must do two entries, with distinct names, for example 'Welfare Officer I' and 'Welfare Officer II'. Do note that the 'Webmaster' is not on the exec, but appears in this list, as this system will then grant the person the admin role.
Do note that we assume one can not hold more than one role. If this is ever the case, then if they ever resign / leave one role, but keep the other, resign them from both roles, and reinstate them in the original role. If the person is one of the extra roles, and is one of the red roles, register them as an extra, then register them in the red role (as red roles grant extra system privileges).</p>
<h2>Editor</h2>
${errorPrompt}
<form id="rolesForm" method="POST" action="/exec/members">
  <table id="rolesTable">
    <thead>
      <tr>
        <th>Role Name</th>
        <th>CIS Code</th>
        <th>Email Override</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <input type="hidden" name="body" id="formDataField">
  <br>
  <button type="button" id="addRoleBtn" class="redirect-button">Add Role</button>
  <button type="submit" id="submitBtn" class="redirect-button">Submit</button>
</form>
<script>
const data = JSON.parse('${JSON.stringify(ranks)}');

// Validation regex for CIS code
const cisRegex = /^[a-z]{4}\d{2}$/i;

const tableBody = document.querySelector("#rolesTable tbody");
const addRoleBtn = document.getElementById("addRoleBtn");
const form = document.getElementById("rolesForm");
const formDataField = document.getElementById("formDataField");

function renderTable() {
  tableBody.innerHTML = "";
  const allRoles = { ...data.main, ...data.extra };
  
  Object.keys(allRoles).forEach(roleName => {
    const isStatutory = roleName in data.main;
    const tr = document.createElement("tr");
    
    // Role Name cell
    const roleCell = document.createElement("td");
    const roleInput = document.createElement("input");
    roleInput.type = "text";
    roleInput.value = roleName;
    if (isStatutory) {
      roleInput.readOnly = true;
      roleInput.classList.add("readonly");
    }
    roleCell.appendChild(roleInput);
    
    // CIS Code cell
    const cisCell = document.createElement("td");
    const cisInput = document.createElement("input");
    cisInput.type = "text";
    cisInput.value = allRoles[roleName];
    cisInput.placeholder = "abcd12";
    cisInput.addEventListener("input", () => {
      if (!cisRegex.test(cisInput.value)) {
        cisInput.style.borderColor = "red";
      } else {
        cisInput.style.borderColor = "";
      }
    });
    cisCell.appendChild(cisInput);
    
    // Email Override cell
    const emailCell = document.createElement("td");
    const emailInput = document.createElement("input");
    emailInput.type = "text";
    emailInput.value = data.emailOverrides[roleName] || "";
    emailInput.placeholder = "Optional";
    emailCell.appendChild(emailInput);
    
    // Actions cell
    const actionCell = document.createElement("td");
    if (!isStatutory) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        delete data.extra[roleName];
        delete data.emailOverrides[roleName];
        renderTable();
      });
      actionCell.appendChild(deleteBtn);
    }
    
    tr.appendChild(roleCell);
    tr.appendChild(cisCell);
    tr.appendChild(emailCell);
    tr.appendChild(actionCell);
    
    // Save on change
    roleInput.addEventListener("change", () => {
      if (roleInput.value.trim() === "") {
        alert("Role name cannot be empty");
        roleInput.value = roleName;
        return;
      }
      if (roleInput.value !== roleName && (roleInput.value in data.main || roleInput.value in data.extra)) {
        alert("Role name must be unique");
        roleInput.value = roleName;
        return;
      }
      if (!isStatutory) {
        delete data.extra[roleName];
        data.extra[roleInput.value] = cisInput.value;
        if (emailInput.value) {
          data.emailOverrides[roleInput.value] = emailInput.value;
        }
      }
      renderTable();
    });
    
    cisInput.addEventListener("change", () => {
      if (isStatutory) {
        data.main[roleName] = cisInput.value;
      } else {
        data.extra[roleName] = cisInput.value;
      }
    });
    
    emailInput.addEventListener("change", () => {
      if (emailInput.value) {
        data.emailOverrides[roleName] = emailInput.value;
      } else {
        delete data.emailOverrides[roleName];
      }
    });
    
    tableBody.appendChild(tr);
  });
}

addRoleBtn.addEventListener("click", () => {
  const newRoleName = prompt("Enter new role name:");
  if (!newRoleName) return;
  if (newRoleName in data.main || newRoleName in data.extra) {
    alert("Role name must be unique");
    return;
  }
  data.extra[newRoleName] = "";
  renderTable();
});

// Before submitting, inject JSON into hidden field
form.addEventListener("submit", () => {
  formDataField.value = JSON.stringify(data);
});

renderTable();
</script>
        `;
        
        // sending it to the user
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "The Exec")
            .replace(/{{pageName}}/g, "The Executive Committee")
            .replace(/{{pageDescriptor}}/g, "")
            .replace(/{{content}}/g, content)

        return{
            body:resp,
            headers:{"Content-Type":"text/html"}
        }
    }
}