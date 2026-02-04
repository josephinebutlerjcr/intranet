const fs = require("fs");
const { loadDB, saveDB } = require("../auxilliaryFunctions/stashStore");
const { isStashManager } = require("../auxilliaryFunctions/stashAuth");

// GET /stash/manage/product/{id} - Edit or create product
module.exports = {
    name: "GET/stash/manage/product/{id}",
    description: "Stash Manager - Edit/Create product",
    execute: async(event, verification) => {
        const db = loadDB();
        
        // Check permission
        if (!isStashManager(verification, db.settings)) {
            const forbiddenPage = require("./error403");
            return await forbiddenPage.execute(event, verification);
        }
        
        // Get product ID from path
        let productId = null;
        if (event.pathParameters && event.pathParameters.id) {
            productId = event.pathParameters.id;
        }
        
        let product = null;
        let isNewProduct = productId === "new";
        
        if (!isNewProduct) {
            product = db.products.find(p => p.id === productId);
            if (!product) {
                const managePage = require("./stashManage");
                event.error = "Product not found";
                return await managePage.execute(event, verification);
            }
        } else {
            // New product template
            product = {
                id: `prod_${Date.now()}`,
                name: "",
                description: "",
                imageUrl: "",
                active: true,
                personalisationAllowed: false,
                personalisationPrice: 0,
                variations: []
            };
        }
        
        const personalisationPrice = (product.personalisationPrice / 100).toFixed(2);
        
        let content = `
            <style>
                .product-editor { max-width: 800px; margin: 0 auto; }
                .product-editor h2 { border-bottom: 2px solid #b1333a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
                .form-section { background: #f9f9f9; padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem; border-left: 4px solid #b1333a; }
                .form-group { margin-bottom: 1.5rem; }
                .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; color: #333; }
                .form-group input, .form-group textarea, .form-group select { 
                    width: 100%; padding: 0.75rem; border: 1px solid #ddd; 
                    border-radius: 3px; font-size: 0.95rem; font-family: inherit;
                }
                .form-group textarea { resize: vertical; min-height: 80px; }
                .checkbox-group { display: flex; align-items: center; gap: 0.5rem; }
                .checkbox-group input[type="checkbox"] { margin: 0; }
                .variations-list { margin-top: 1rem; }
                .variation-item { background: white; padding: 1rem; margin: 0.5rem 0; border-radius: 3px; border-left: 3px solid #999; display: flex; justify-content: space-between; align-items: center; }
                .variation-item.active { border-left-color: #4caf50; }
                .button-group { display: flex; gap: 1rem; flex-wrap: wrap; }
                .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 3px; cursor: pointer; font-size: 0.95rem; transition: background 0.2s; }
                .btn-primary { background: #b1333a; color: white; }
                .btn-primary:hover { background: #8a2629; }
                .btn-secondary { background: #666; color: white; }
                .btn-secondary:hover { background: #444; }
                .btn-danger { background: #f44336; color: white; }
                .btn-danger:hover { background: #da190b; }
                .btn-small { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
            </style>
            
            <div class="product-editor">
                <h2>${isNewProduct ? 'Create New Product' : 'Edit Product'}</h2>
                
                <form id="product-form">
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        
                        <div class="form-group">
                            <label for="name">Product Name *</label>
                            <input type="text" id="name" name="name" value="${product.name}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description">${product.description}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="imageUrl">Image URL</label>
                            <input type="url" id="imageUrl" name="imageUrl" value="${product.imageUrl}" placeholder="https://example.com/image.jpg">
                            ${product.imageUrl ? `<img src="${product.imageUrl}" alt="Product" style="max-width: 150px; max-height: 150px; margin-top: 0.5rem; border-radius: 3px;">` : '<small style="color: #666;">No image</small>'}
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3>Personalisation</h3>
                        
                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="personalisationAllowed" name="personalisationAllowed" ${product.personalisationAllowed ? 'checked' : ''}>
                            <label for="personalisationAllowed" style="margin-bottom: 0;">Allow personalisation (A-Z0-9, max 4 chars)</label>
                        </div>
                        
                        <div class="form-group" id="personalisationPriceGroup" style="${product.personalisationAllowed ? '' : 'display: none;'}">
                            <label for="personalisationPrice">Personalisation Cost (£)</label>
                            <input type="number" id="personalisationPrice" name="personalisationPrice" value="${personalisationPrice}" min="0" step="0.01">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h3>Status</h3>
                        
                        <div class="form-group checkbox-group">
                            <input type="checkbox" id="active" name="active" ${product.active ? 'checked' : ''}>
                            <label for="active" style="margin-bottom: 0;">Active (visible in store)</label>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-primary" onclick="saveProduct('${product.id}', ${isNewProduct})">
                            ${isNewProduct ? '✓ Create Product' : '✓ Save Changes'}
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="location.href='/stash/manage?tab=products'">
                            ← Cancel
                        </button>
                        ${!isNewProduct ? `<button type="button" class="btn btn-danger" onclick="deleteThisProduct('${product.id}')">🗑 Delete Product</button>` : ''}
                    </div>
                </form>
            </div>
            
            <script>
                document.getElementById('personalisationAllowed').addEventListener('change', function() {
                    document.getElementById('personalisationPriceGroup').style.display = this.checked ? 'block' : 'none';
                });
                
                function saveProduct(productId, isNew) {
                    const form = document.getElementById('product-form');
                    const name = document.getElementById('name').value.trim();
                    
                    if (!name) {
                        alert('Product name is required');
                        return;
                    }
                    
                    const params = new URLSearchParams();
                    params.append('action', 'saveProduct');
                    params.append('productId', productId);
                    params.append('isNew', isNew ? '1' : '0');
                    params.append('name', name);
                    params.append('description', document.getElementById('description').value);
                    params.append('imageUrl', document.getElementById('imageUrl').value);
                    params.append('personalisationAllowed', document.getElementById('personalisationAllowed').checked ? '1' : '0');
                    params.append('personalisationPrice', document.getElementById('personalisationPrice').value || '0');
                    params.append('active', document.getElementById('active').checked ? '1' : '0');
                    
                    fetch('/stash/manage/settings', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: params.toString()
                    }).then(r => r.text()).then(text => {
                        if (text.includes('success')) {
                            alert('Product saved successfully!');
                            location.href = '/stash/manage?tab=products';
                        } else {
                            alert('Error saving product: ' + text);
                        }
                    }).catch(e => {
                        alert('Error: ' + e.message);
                    });
                }
                
                function deleteThisProduct(productId) {
                    if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
                        fetch('/stash/manage/settings', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: 'action=deleteProduct&productId=' + productId
                        }).then(() => {
                            alert('Product deleted!');
                            location.href = '/stash/manage?tab=products';
                        });
                    }
                }
            </script>
        `;
        
        // Render using generalPage template
        let resp = fs.readFileSync("./assets/html/generalPage.html").toString()
            .replace(/{{pageNameShort}}/g, "Edit Product")
            .replace(/{{pageName}}/g, isNewProduct ? "Create New Product" : `Edit ${product.name}`)
            .replace(/{{pageDescriptor}}/g, "Manage product details and settings")
            .replace(/{{managerLink}}/g, '')
            .replace(/{{content}}/g, content);
        
        return{
            body: resp,
            headers: {"Content-Type": "text/html"}
        };
    }
};
