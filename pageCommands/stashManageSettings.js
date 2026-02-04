const fs = require("fs");
const { loadDB, saveDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");
const { validatePrice, validateStock, sanitiseText } = require("../auxilliaryFunctions/stashValidation");
const { parseBody } = require("../auxilliaryFunctions/formatting");

// POST /stash/manage/settings - Manager settings updates
module.exports = {
    name: "POST/stash/manage/settings",
    description: "Stash Manager - Settings POST handler",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Check permission
        if (!isStashManager(verification, db.settings)) {
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event, verification);
        }
        
        const inputBody = await parseBody(event.body);
        const action = inputBody.action;
        
        let success = true;
        let message = "";
        
        try {
            if (action === "updateStatus") {
                db.settings.isOpen = inputBody.isOpen === "1" || inputBody.isOpen === true;
                message = `Store is now ${db.settings.isOpen ? "OPEN" : "CLOSED"}`;
            }
            
            else if (action === "updateBankDetails") {
                db.settings.bankDetails = {
                    accountName: sanitiseText(inputBody.accountName, 100),
                    sortCode: inputBody.sortCode.trim(),
                    accountNumber: inputBody.accountNumber.trim(),
                    referenceHint: sanitiseText(inputBody.referenceHint, 50)
                };
                message = "Bank details updated";
            }
            
            else if (action === "addManager") {
                const cis = (inputBody.cis || "").trim().toLowerCase();
                if (!/^[a-z]{4}[0-9]{2}$/.test(cis)) {
                    success = false;
                    message = "Invalid CIS code format";
                } else if (db.settings.managerCisAllowlist.includes(cis)) {
                    success = false;
                    message = "This CIS code is already a manager";
                } else {
                    db.settings.managerCisAllowlist.push(cis);
                    message = `Added ${cis} as manager`;
                }
            }
            
            else if (action === "removeManager") {
                const cis = (inputBody.cis || "").trim().toLowerCase();
                const idx = db.settings.managerCisAllowlist.indexOf(cis);
                if (idx === -1) {
                    success = false;
                    message = "Manager not found";
                } else {
                    db.settings.managerCisAllowlist.splice(idx, 1);
                    message = `Removed ${cis} from managers`;
                }
            }
            
            else if (action === "saveProduct") {
                const productId = inputBody.productId;
                const isNew = inputBody.isNew === "1" || inputBody.isNew === true;
                const personalisationPrice = Math.round(parseFloat(inputBody.personalisationPrice || 0) * 100);
                
                const productData = {
                    id: productId,
                    name: sanitiseText(inputBody.name, 100),
                    description: sanitiseText(inputBody.description, 500),
                    imageUrl: (inputBody.imageUrl || "").trim(),
                    active: inputBody.active === "1" || inputBody.active === true,
                    personalisationAllowed: inputBody.personalisationAllowed === "1" || inputBody.personalisationAllowed === true,
                    personalisationPrice: personalisationPrice,
                    variations: []
                };
                
                if (isNew) {
                    // Create new product with default variation
                    productData.variations = [{
                        id: `var_${productId}_default`,
                        label: "Standard",
                        priceDelta: 0,
                        price: 1000, // £10.00 default
                        stock: 10,
                        active: true
                    }];
                    db.products.push(productData);
                    message = `Product "${productData.name}" created`;
                } else {
                    // Update existing product
                    const existingIdx = db.products.findIndex(p => p.id === productId);
                    if (existingIdx === -1) {
                        success = false;
                        message = "Product not found";
                    } else {
                        // Preserve variations
                        productData.variations = db.products[existingIdx].variations;
                        db.products[existingIdx] = productData;
                        message = `Product "${productData.name}" updated`;
                    }
                }
            }
            
            else if (action === "deleteProduct") {
                const productId = inputBody.productId;
                const idx = db.products.findIndex(p => p.id === productId);
                if (idx === -1) {
                    success = false;
                    message = "Product not found";
                } else {
                    const productName = db.products[idx].name;
                    db.products.splice(idx, 1);
                    message = `Product "${productName}" deleted`;
                }
            }
            
            if (success) {
                saveDB(db);
            }
        } catch (err) {
            success = false;
            message = `Error: ${err.message}`;
        }
        
        // Return JSON response for AJAX
        return {
            body: JSON.stringify({ success, message }),
            headers: {"Content-Type": "application/json"}
        };
    }
};
