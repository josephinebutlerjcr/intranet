const fs = require("fs");
const { loadDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");

// GET /stash/order/{id} - Order confirmation/view
// Also handles query param format: /stash/order?id=...
module.exports = {
    name: "GET/stash/order/{id}",
    description: "Stash - Order confirmation",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Get order ID from either pathParameters or queryStringParameters
        let orderId = null;
        if (event.orderId) {
            orderId = event.orderId;
        } else if (event.queryStringParameters && event.queryStringParameters.id) {
            orderId = event.queryStringParameters.id;
        } else if (event.pathParameters && event.pathParameters.id) {
            orderId = event.pathParameters.id;
        }
        
        if (!orderId) {
            const stashPage = require("./stash");
            event.error = "No order specified";
            return await stashPage.execute(event, verification);
        }
        
        // Find order
        const order = db.orders.find(o => o.id === orderId);
        if (!order) {
            const stashPage = require("./stash");
            event.error = "Order not found";
            return await stashPage.execute(event, verification);
        }
        
        // Build confirmation HTML
        let content = `
            <style>
                .stash-confirmation { max-width: 900px; margin: 0 auto; }
                .stash-confirmation h2 { border-bottom: 2px solid #b1333a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                .stash-confirmation h3 { color: #333; margin-top: 1.5rem; margin-bottom: 1rem; }
                .confirmation-box { 
                    background: #e8f5e9; border-left: 4px solid #4caf50; padding: 1.5rem; 
                    border-radius: 4px; margin-bottom: 2rem;
                }
                .confirmation-box p { margin: 0.5rem 0; }
                .order-details { margin: 2rem 0; }
                .order-details .stash-table { margin: 1rem 0; }
                .order-totals { 
                    background: #f9f9f9; padding: 1.5rem; border-radius: 4px; 
                    border-left: 4px solid #b1333a; margin: 2rem 0;
                }
                .order-totals p { margin: 0.5rem 0; font-size: 0.95rem; }
                .order-totals h3 { margin-top: 1rem; margin-bottom: 0; }
                .payment-instructions { 
                    background: #fff3e0; border-left: 4px solid #ff9800; padding: 1.5rem; 
                    border-radius: 4px; margin: 2rem 0;
                }
                .payment-instructions h4 { color: #ff6f00; margin-top: 0; }
                .bank-details { background: white; padding: 1rem; margin: 1rem 0; border-radius: 3px; }
                .back-button { 
                    background: #666; border: none; padding: 0.75rem 1.5rem; cursor: pointer;
                    border-radius: 3px; color: white; font-weight: normal; margin-top: 1.5rem; transition: background 0.2s;
                }
                .back-button:hover { background: #444; }
            </style>
            
            <div class="stash-confirmation">
                <h2>✓ Order Confirmation</h2>
                
                <div class="confirmation-box">
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Order Date:</strong> ${new Date(order.createdAt * 1000).toLocaleString()}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem;">Thank you for your order! Please keep your order ID for reference.</p>
                </div>
                
                <div class="order-details">
                    <h3>Order Details</h3>
                    <table class="stash-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Variation</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Personalisation</th>
                                <th>Line Total</th>
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
                </div>
                
                <div class="order-totals">
                    <p><strong>Merchandise Total:</strong> £${(order.subtotal / 100).toFixed(2)}</p>
                    ${order.personalisationTotal > 0 ? `<p><strong>Personalisation:</strong> £${(order.personalisationTotal / 100).toFixed(2)}</p>` : ''}
                    <h3>Amount Due: £${(order.grandTotal / 100).toFixed(2)}</h3>
                </div>
                
                <div class="payment-instructions">
                    <h4>💳 Payment Instructions</h4>
                    <p>Please transfer the amount due via bank transfer:</p>
                    <div class="bank-details">
                        <p><strong>Account Name:</strong> ${db.settings.bankDetails.accountName}</p>
                        <p><strong>Sort Code:</strong> ${db.settings.bankDetails.sortCode}</p>
                        <p><strong>Account Number:</strong> ${db.settings.bankDetails.accountNumber}</p>
                        <p><strong>Reference:</strong> ${db.settings.bankDetails.referenceHint}${order.id}</p>
                    </div>
                    <p style="font-size: 0.85rem; color: #666; margin-top: 1rem;">Please allow 1-2 working days for processing after payment.</p>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
                    <button class="back-button" onclick="location.href='/stash'">← Back to Store</button>
                    <button class="back-button" onclick="location.href='/'">← Back to Home</button>
                </div>
            </div>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Order Confirmed")
            .replace(/{{pageName}}/g, `Order ${order.id}`)
            .replace(/{{pageDescriptor}}/g, "Your order has been submitted")
            .replace(/{{managerLink}}/g, isStashManager(verification, db.settings) ? '<li><a href="/stash/manage">Merch Manager</a></li>' : '')
            .replace(/{{content}}/g, content);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
