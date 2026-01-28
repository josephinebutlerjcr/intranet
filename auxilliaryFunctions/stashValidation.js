// Validate personalisation text
function validatePersonalisation(text) {
    if (!text) return { valid: true, error: null };
    
    const trimmed = text.trim();
    if (trimmed.length === 0) return { valid: true, error: null };
    if (trimmed.length > 4) return { valid: false, error: "Personalisation must be 4 characters or less" };
    if (!/^[A-Z0-9]+$/i.test(trimmed)) return { valid: false, error: "Personalisation must contain only A-Z and 0-9" };
    
    return { valid: true, error: null, cleaned: trimmed.toUpperCase() };
}

// Validate product name / description (basic HTML escape + length)
function sanitiseText(text, maxLength = 200) {
    if (!text) return "";
    
    const trimmed = text.trim();
    if (trimmed.length > maxLength) return trimmed.substring(0, maxLength);
    
    return trimmed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Validate CIS code format
function validateCISCode(cis) {
    if (!cis) return false;
    return /^[a-z]{4}[0-9]{2}$/i.test(cis.trim().toLowerCase());
}

// Validate email format (basic)
function validateEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate price format
function validatePrice(price) {
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0 && num <= 99999.99;
}

// Validate stock count
function validateStock(stock) {
    const num = parseInt(stock, 10);
    return !isNaN(num) && num >= 0 && num <= 999999;
}

module.exports = {
    validatePersonalisation,
    sanitiseText,
    validateCISCode,
    validateEmail,
    validatePrice,
    validateStock
};
