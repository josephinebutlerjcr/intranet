// Check if user is a stash manager
function isStashManager(user, settings) {
    if (!user || !user.cis || !settings || !settings.managerCisAllowlist) {
        return false;
    }
    return settings.managerCisAllowlist.includes(user.cis.toLowerCase());
}

module.exports = {
    isStashManager
};
