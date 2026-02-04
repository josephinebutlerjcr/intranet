const fs = require("fs");
const { loadDB, saveDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");
const { parseBody } = require("../auxilliaryFunctions/formatting");

// GET /stash/manage/order/:id - View and manage order
module.exports = {
    name: "GET/stash/manage/order",
    description: "Stash Manager - Order detail view",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Check permission
        if (!isStashManager(verification, db.settings)) {
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event, verification);
        }
        
        // Get order ID from query param
        let orderId = null;
        if (event.queryStringParameters && event.queryStringParameters.id) {
            orderId = event.queryStringParameters.id;
        }
        
        if (!orderId) {
            event.error = "No order specified";
            const stashManagePage = require("./stashManage");
            return await stashManagePage.execute(event, verification);
        }
        
        // Find order
        const order = db.orders.find(o => o.id === orderId);
        if (!order) {
            event.error = "Order not found";
            const stashManagePage = require("./stashManage");
            return await stashManagePage.execute(event, verification);
        }
        
        // Build order detail HTML
        let content = `
            <button class="redirect-button" onclick="location.href='/stash/manage?tab=orders'">Back to Orders</button>
            
            <div class="order-detail">
                <h2>Order ${order.id}</h2>
                
                <div class="order-header">
                    <p><strong>Status:</strong> ${order.status}</p>
                    <p><strong>Customer:</strong> ${order.orderedBy.name} (${order.orderedBy.cis || 'N/A'})</p>
                    <p><strong>Email:</strong> ${order.orderedBy.email || 'N/A'}</p>
                    <p><strong>Order Date:</strong> ${new Date(order.createdAt * 1000).toLocaleString()}</p>
                </div>
                
                <h3>Line Items</h3>
                <table class="stash-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Variation</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Personalisation</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.lines.map(line => `
                            <tr>
                                <td>${line.productNameSnapshot}</td>
                                <td>${line.variationLabelSnapshot}</td>
                                <td>${line.qty}</td>
                                <td>£${(line.unitPriceSnapshot / 100).toFixed(2)}</td>
                                <td>${line.personalisationText || '—'}</td>
                                <td>£${((line.qty * line.unitPriceSnapshot) / 100).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="order-totals">
                    <p><strong>Merchandise Total:</strong> £${(order.subtotal / 100).toFixed(2)}</p>
                    ${order.personalisationTotal > 0 ? `<p><strong>Personalisation:</strong> £${(order.personalisationTotal / 100).toFixed(2)}</p>` : ''}
                    <h3 style="color: #b1333a;">Grand Total: £${(order.grandTotal / 100).toFixed(2)}</h3>
                </div>
                
                <div class="order-actions">
                    <h3>Actions</h3>
                    ${order.status === "UNFULFILLED" ? `
                        <button class="redirect-button" onclick="updateOrderStatus('${order.id}', 'FULFILLED')">
                            Mark as Fulfilled
                        </button>
                    ` : `
                        <button class="redirect-button" onclick="updateOrderStatus('${order.id}', 'UNFULFILLED')">
                            Mark as Unfulfilled
                        </button>
                    `}
                </div>
            </div>
            
            <script>
                function updateOrderStatus(orderId, newStatus) {
                    if (confirm('Change order status to ' + newStatus + '?')) {
                        fetch('/stash/manage/order?id=' + orderId, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: 'action=updateStatus&status=' + newStatus
                        }).then(() => location.reload());
                    }
                }
            </script>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Order Detail")
            .replace(/{{pageName}}/g, `Order ${order.id}`)
            .replace(/{{pageDescriptor}}/g, "Manage order fulfillment")
            .replace(/{{content}}/g, content);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
