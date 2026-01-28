const fs = require("fs");
const { loadDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");
const { getTime, generateToken } = require("../auxilliaryFunctions/formatting");
const { writeMockReceipt } = require("../auxilliaryFunctions/stashEmailMock");
const { validatePersonalisation } = require("../auxilliaryFunctions/stashValidation");

// POST /stash/checkout - Process checkout
module.exports = {
    name: "POST/stash/checkout",
    description: "Stash - Process checkout",
    execute: async(event, verification) => {
        const db = loadDB();
        const { parseBody } = require("../auxilliaryFunctions/formatting");
        const inputBody = await parseBody(event.body);
        
        // Parse basket from form data
        let basketItems = [];
        try {
            basketItems = JSON.parse(inputBody.basket || "[]");
        } catch (e) {
            event.error = "Invalid basket data";
            const stashPage = require("./stash");
            return await stashPage.execute(event, verification);
        }
        
        if (basketItems.length === 0) {
            event.error = "Basket is empty";
            const stashPage = require("./stash");
            return await stashPage.execute(event, verification);
        }
        
        // Check if store is open
        if (!db.settings.isOpen) {
            event.error = "Store is currently closed";
            const stashPage = require("./stash");
            return await stashPage.execute(event, verification);
        }
        
        // Validate and process order
        let orderLines = [];
        let subtotal = 0;
        let personalisationTotal = 0;
        let validationErrors = [];
        
        for (let item of basketItems) {
            // Find product
            const product = db.products.find(p => p.id === item.productId);
            if (!product || !product.active) {
                validationErrors.push(`Product ${item.productId} not found or inactive`);
                continue;
            }
            
            // Find variation
            const variation = product.variations.find(v => v.id === item.variationId);
            if (!variation || !variation.active) {
                validationErrors.push(`Variation ${item.variationId} not found or inactive`);
                continue;
            }
            
            // Check stock
            if (variation.stock < 1) {
                validationErrors.push(`${product.name} (${variation.label}) is out of stock`);
                continue;
            }
            
            // Validate personalisation if present
            if (item.personalisationText) {
                if (!product.personalisationAllowed) {
                    validationErrors.push(`${product.name} does not allow personalisation`);
                    continue;
                }
                
                const valResult = validatePersonalisation(item.personalisationText);
                if (!valResult.valid) {
                    validationErrors.push(`Personalisation for ${product.name}: ${valResult.error}`);
                    continue;
                }
                
                item.personalisationText = valResult.cleaned;
                personalisationTotal += product.personalisationPrice;
            }
            
            // Add to order
            const linePrice = variation.price + (item.personalisationText ? product.personalisationPrice : 0);
            const lineTotal = linePrice * 1; // qty is 1 per item added
            
            orderLines.push({
                productId: product.id,
                productNameSnapshot: product.name,
                variationId: variation.id,
                variationLabelSnapshot: variation.label,
                qty: 1,
                unitPriceSnapshot: variation.price,
                personalisationText: item.personalisationText || null
            });
            
            subtotal += variation.price;
        }
        
        if (validationErrors.length > 0) {
            event.error = "Order validation failed: " + validationErrors.join("; ");
            const stashPage = require("./stash");
            return await stashPage.execute(event, verification);
        }
        
        if (orderLines.length === 0) {
            event.error = "No valid items in basket";
            const stashPage = require("./stash");
            return await stashPage.execute(event, verification);
        }
        
        // Create order record
        const orderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const order = {
            id: orderId,
            createdAt: getTime(),
            status: "UNFULFILLED",
            orderedBy: {
                name: verification.name || "Unknown",
                cis: verification.cis,
                email: verification.cis ? `${verification.cis}@durham.ac.uk` : null
            },
            lines: orderLines,
            subtotal: subtotal,
            personalisationTotal: personalisationTotal,
            grandTotal: subtotal + personalisationTotal
        };
        
        // Decrement stock
        for (let line of orderLines) {
            const product = db.products.find(p => p.id === line.productId);
            const variation = product.variations.find(v => v.id === line.variationId);
            variation.stock -= line.qty;
        }
        
        // Add order to DB and save
        db.orders.push(order);
        const { saveDB } = require("../auxilliaryFunctions/stashStore");
        saveDB(db);
        
        // Write mock receipt
        writeMockReceipt(order, db.settings.bankDetails);
        
        // Redirect to confirmation
        event.orderId = orderId;
        const confirmPage = require("./stashConfirmation");
        return await confirmPage.execute(event, verification);
    }
};
