const fs = require("fs");
const { loadDB, saveDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");

// GET /stash/manage - Manager portal
module.exports = {
    name: "GET/stash/manage",
    description: "Stash Manager - Manager portal",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Check permission
        if (!isStashManager(verification, db.settings)) {
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event, verification);
        }
        
        // Determine tab from query param
        let tab = "dashboard";
        if (event.queryStringParameters && event.queryStringParameters.tab) {
            tab = event.queryStringParameters.tab;
        }
        
        let content = `
            <style>
                .stash-manage-container { max-width: 1200px; margin: 0 auto; }
                .stash-manage-nav { 
                    display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap;
                    background: #f5f5f5; padding: 1rem; border-radius: 4px;
                }
                .stash-manage-nav .redirect-button { 
                    margin: 0; flex: 1; min-width: 150px;
                    background: #666; border: none; padding: 0.75rem; cursor: pointer;
                    border-radius: 3px; color: white; font-weight: normal; transition: background 0.2s;
                }
                .stash-manage-nav .redirect-button:hover { background: #444; }
                .stash-manage-section { margin-bottom: 2rem; }
                .stash-manage-section h2 { border-bottom: 2px solid #b1333a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                .stash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .stat { background: #f9f9f9; padding: 1rem; border-left: 4px solid #b1333a; border-radius: 3px; }
                .stat strong { display: block; color: #b1333a; margin-bottom: 0.5rem; }
                .form-group { margin-bottom: 1.5rem; }
                .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; color: #333; }
                .form-group input, .form-group select { 
                    width: 100%; max-width: 400px; padding: 0.5rem; border: 1px solid #ddd; 
                    border-radius: 3px; font-size: 0.95rem;
                }
                .stash-table { width: 100%; border-collapse: collapse; background: white; margin: 1rem 0; }
                .stash-table th, .stash-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
                .stash-table th { background: #f5f5f5; font-weight: bold; }
                .stash-table tr:hover { background: #f9f9f9; }
                .small-btn { padding: 0.4rem 0.8rem; background: #b1333a; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.85rem; }
                .small-btn:hover { background: #8a2629; }
                .manager-item { background: #f9f9f9; padding: 0.75rem; margin: 0.5rem 0; border-radius: 3px; display: flex; justify-content: space-between; align-items: center; }
            </style>
            
            <div class="stash-manage-container">
                <div class="stash-manage-nav">
                    <button class="redirect-button" onclick="location.href='/stash/manage?tab=dashboard'">Dashboard</button>
                    <button class="redirect-button" onclick="location.href='/stash/manage?tab=settings'">Settings</button>
                    <button class="redirect-button" onclick="location.href='/stash/manage?tab=products'">Products</button>
                    <button class="redirect-button" onclick="location.href='/stash/manage?tab=orders'">Orders</button>
                    <button class="redirect-button" onclick="location.href='/'">← Back to Home</button>
                </div>`;
        
        // Dashboard tab
        if (tab === "dashboard") {
            const openOrders = db.orders.filter(o => o.status === "UNFULFILLED").length;
            const totalOrders = db.orders.length;
            const isOpen = db.settings.isOpen;
            
            content += `<div class="stash-manage-section">
                <h2>Manager Dashboard</h2>
                <div class="stash-stats">
                    <div class="stat">
                        <strong>Store Status:</strong> ${isOpen ? '<span style="color:green;">OPEN</span>' : '<span style="color:red;">CLOSED</span>'}
                    </div>
                    <div class="stat">
                        <strong>Total Orders:</strong> ${totalOrders}
                    </div>
                    <div class="stat">
                        <strong>Unfulfilled Orders:</strong> ${openOrders}
                    </div>
                    <div class="stat">
                        <strong>Active Products:</strong> ${db.products.filter(p => p.active).length}
                    </div>
                </div>
            </div>
            `;
        }
        
        // Settings tab
        else if (tab === "settings") {
            const bd = db.settings.bankDetails;
            
            content += `<div class="stash-manage-section">
                <h2>Store Settings</h2>
                
                <div class="form-group">
                    <h3>Store Status</h3>
                    <label>
                        <input type="radio" name="store-status" value="open" ${db.settings.isOpen ? 'checked' : ''} 
                            onchange="updateStoreStatus(true)"> Open
                    </label>
                    <label>
                        <input type="radio" name="store-status" value="closed" ${!db.settings.isOpen ? 'checked' : ''} 
                            onchange="updateStoreStatus(false)"> Closed
                    </label>
                </div>
                
                <div class="form-group">
                    <h3>Bank Details</h3>
                    <form id="bank-details-form">
                        <label>Account Name:</label>
                        <input type="text" name="accountName" value="${bd.accountName}" required>
                        
                        <label>Sort Code (xx-xx-xx):</label>
                        <input type="text" name="sortCode" value="${bd.sortCode}" required>
                        
                        <label>Account Number:</label>
                        <input type="text" name="accountNumber" value="${bd.accountNumber}" required>
                        
                        <label>Reference Hint (prefix):</label>
                        <input type="text" name="referenceHint" value="${bd.referenceHint}" required>
                        
                        <button type="button" class="redirect-button" onclick="saveBankDetails()">Save Bank Details</button>
                    </form>
                </div>
                
                <div class="form-group">
                    <h3>Manager CIS Allowlist</h3>
                    <p>Current managers: ${db.settings.managerCisAllowlist.join(", ")}</p>
                    <input type="text" id="manager-cis-input" placeholder="Enter CIS code to add">
                    <button class="redirect-button" onclick="addManager()">Add Manager</button>
                    <div id="manager-list">
                        ${db.settings.managerCisAllowlist.map(cis => `
                            <div class="manager-item">
                                ${cis}
                                <button class="small-btn" onclick="removeManager('${cis}')">Remove</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        }
        
        // Products tab
        else if (tab === "products") {
            content += `<div class="stash-manage-section">
                <h2>Products</h2>
                
                <button class="redirect-button" onclick="location.href='/stash/manage/product/new'" style="background: #4caf50;">+ Add New Product</button>
                
                <table class="stash-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Active</th>
                            <th>Variations</th>
                            <th>Personalisation</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${db.products.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.active ? '✓' : '✗'}</td>
                                <td>${p.variations.length}</td>
                                <td>${p.personalisationAllowed ? '✓ (+£' + (p.personalisationPrice / 100).toFixed(2) + ')' : '✗'}</td>
                                <td>
                                    <button class="small-btn" onclick="location.href='/stash/manage/product/${p.id}'" style="background: #2196F3;">Edit</button>
                                    <button class="small-btn" onclick="deleteProduct('${p.id}')" style="background: #f44336;">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }
        
        // Orders tab
        else if (tab === "orders") {
            const sortedOrders = db.orders.sort((a, b) => b.createdAt - a.createdAt);
            const unfulfilledCount = sortedOrders.filter(o => o.status === "UNFULFILLED").length;
            
            content += `<div class="stash-manage-section">
                <h2>Orders</h2>
                
                <div class="stash-stats">
                    <div class="stat"><strong>Unfulfilled:</strong> ${unfulfilledCount}</div>
                    <div class="stat"><strong>Total:</strong> ${sortedOrders.length}</div>
                </div>
                
                <table class="stash-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedOrders.map(o => `
                            <tr>
                                <td>${o.id}</td>
                                <td>${o.orderedBy.name}</td>
                                <td>${new Date(o.createdAt * 1000).toLocaleDateString()}</td>
                                <td>${o.status}</td>
                                <td>£${(o.grandTotal / 100).toFixed(2)}</td>
                                <td>
                                    <button class="small-btn" onclick="location.href='/stash/manage/order?id=${o.id}'">View</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }
        
        // Add scripts for settings management
        const scripts = `
            <script>
                function updateStoreStatus(isOpen) {
                    fetch('/stash/manage/settings', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: 'action=updateStatus&isOpen=' + (isOpen ? '1' : '0')
                    }).then(() => location.reload());
                }
                
                function saveBankDetails() {
                    const form = document.getElementById('bank-details-form');
                    const params = new URLSearchParams();
                    params.append('action', 'updateBankDetails');
                    params.append('accountName', form.accountName.value);
                    params.append('sortCode', form.sortCode.value);
                    params.append('accountNumber', form.accountNumber.value);
                    params.append('referenceHint', form.referenceHint.value);
                    
                    fetch('/stash/manage/settings', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: params.toString()
                    }).then(() => {
                        alert('Bank details updated!');
                        location.reload();
                    });
                }
                
                function addManager() {
                    const cis = document.getElementById('manager-cis-input').value.trim().toLowerCase();
                    if (!cis || !/^[a-z]{4}[0-9]{2}$/.test(cis)) {
                        alert('Invalid CIS code format');
                        return;
                    }
                    
                    fetch('/stash/manage/settings', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: 'action=addManager&cis=' + cis
                    }).then(() => location.reload());
                }
                
                function removeManager(cis) {
                    if (confirm('Remove ' + cis + ' as manager?')) {
                        fetch('/stash/manage/settings', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: 'action=removeManager&cis=' + cis
                        }).then(() => location.reload());
                    }                    
                    function deleteProduct(productId) {
                        if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
                            fetch('/stash/manage/settings', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                                body: 'action=deleteProduct&productId=' + productId
                            }).then(() => location.reload());
                        }
                    }                }
            </script>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Merch Manager")
            .replace(/{{pageName}}/g, "Merchandise Manager Portal")
            .replace(/{{pageDescriptor}}/g, "Manage store settings, products, and orders")
            .replace(/{{managerLink}}/g, '')
            .replace(/{{content}}/g, content + scripts);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
