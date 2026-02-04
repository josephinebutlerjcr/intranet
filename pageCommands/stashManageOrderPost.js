const fs = require("fs");
const { loadDB, saveDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");
const { parseBody } = require("../auxilliaryFunctions/formatting");

// POST /stash/manage/order/:id - Update order status
module.exports = {
    name: "POST/stash/manage/order",
    description: "Stash Manager - Order status update",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Check permission
        if (!isStashManager(verification, db.settings)) {
            return {
                body: JSON.stringify({ success: false, error: "Unauthorized" }),
                headers: {"Content-Type": "application/json"}
            };
        }
        
        const inputBody = await parseBody(event.body);
        const action = inputBody.action;
        
        // Get order ID from query param
        let orderId = null;
        if (event.queryStringParameters && event.queryStringParameters.id) {
            orderId = event.queryStringParameters.id;
        }
        
        if (!orderId) {
            return {
                body: JSON.stringify({ success: false, error: "No order ID" }),
                headers: {"Content-Type": "application/json"}
            };
        }
        
        // Find order
        const order = db.orders.find(o => o.id === orderId);
        if (!order) {
            return {
                body: JSON.stringify({ success: false, error: "Order not found" }),
                headers: {"Content-Type": "application/json"}
            };
        }
        
        try {
            if (action === "updateStatus") {
                const newStatus = inputBody.status;
                if (!["UNFULFILLED", "FULFILLED"].includes(newStatus)) {
                    return {
                        body: JSON.stringify({ success: false, error: "Invalid status" }),
                        headers: {"Content-Type": "application/json"}
                    };
                }
                
                order.status = newStatus;
                saveDB(db);
                
                return {
                    body: JSON.stringify({ success: true, message: `Order marked as ${newStatus}` }),
                    headers: {"Content-Type": "application/json"}
                };
            }
        } catch (err) {
            return {
                body: JSON.stringify({ success: false, error: err.message }),
                headers: {"Content-Type": "application/json"}
            };
        }
    }
};
