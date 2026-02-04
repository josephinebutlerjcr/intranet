const fs = require("fs");
const path = require("path");

const OUTBOX_PATH = path.join(__dirname, "../local_data/stash_emails");

// Ensure outbox directory exists
function ensureOutbox() {
    if (!fs.existsSync(OUTBOX_PATH)) {
        fs.mkdirSync(OUTBOX_PATH, { recursive: true });
    }
}

// Write mock receipt email to local outbox
function writeMockReceipt(order, bankDetails) {
    ensureOutbox();
    
    try {
        const filename = `order_${order.id}.txt`;
        const filepath = path.join(OUTBOX_PATH, filename);
        
        let content = `ORDER RECEIPT - STASH MERCHANDISE\n`;
        content += `=====================================\n\n`;
        content += `Order ID: ${order.id}\n`;
        content += `Order Date: ${new Date(order.createdAt * 1000).toLocaleString()}\n`;
        content += `Status: ${order.status}\n\n`;
        
        content += `ORDERED BY:\n`;
        content += `Name: ${order.orderedBy.name}\n`;
        if (order.orderedBy.cis) content += `CIS: ${order.orderedBy.cis}\n`;
        if (order.orderedBy.email) content += `Email: ${order.orderedBy.email}\n`;
        content += `\n`;
        
        content += `LINE ITEMS:\n`;
        content += `-----------------------------------\n`;
        
        for (let line of order.lines) {
            content += `Product: ${line.productNameSnapshot}\n`;
            content += `Variation: ${line.variationLabelSnapshot}\n`;
            content += `Quantity: ${line.qty}\n`;
            content += `Unit Price: £${(line.unitPriceSnapshot / 100).toFixed(2)}\n`;
            if (line.personalisationText) {
                content += `Personalisation: ${line.personalisationText}\n`;
            }
            content += `Line Total: £${((line.qty * line.unitPriceSnapshot) / 100).toFixed(2)}\n`;
            content += `-----------------------------------\n`;
        }
        
        content += `\n`;
        content += `TOTALS:\n`;
        content += `Merchandise Total: £${(order.subtotal / 100).toFixed(2)}\n`;
        if (order.personalisationTotal > 0) {
            content += `Personalisation: £${(order.personalisationTotal / 100).toFixed(2)}\n`;
        }
        content += `GRAND TOTAL DUE: £${(order.grandTotal / 100).toFixed(2)}\n\n`;
        
        content += `PAYMENT INSTRUCTIONS:\n`;
        content += `Please transfer the amount due via bank transfer to:\n\n`;
        content += `Account Name: ${bankDetails.accountName}\n`;
        content += `Sort Code: ${bankDetails.sortCode}\n`;
        content += `Account Number: ${bankDetails.accountNumber}\n`;
        content += `Reference: ${bankDetails.referenceHint}${order.id}\n\n`;
        
        content += `Please allow 1-2 working days for processing after payment.\n`;
        content += `Thank you for your order!\n`;
        
        fs.writeFileSync(filepath, content, "utf8");
        return { success: true, path: filepath };
    } catch (err) {
        console.error("Error writing mock receipt:", err);
        return { success: false, error: err.message };
    }
}

// Get list of receipts in outbox
function listReceipts() {
    ensureOutbox();
    
    try {
        const files = fs.readdirSync(OUTBOX_PATH);
        return files.filter(f => f.startsWith("order_") && f.endsWith(".txt"));
    } catch (err) {
        console.error("Error listing receipts:", err);
        return [];
    }
}

module.exports = {
    writeMockReceipt,
    listReceipts,
    ensureOutbox
};
