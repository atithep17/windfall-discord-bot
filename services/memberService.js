const { db } = require('../firebase');

class MemberService {
  constructor() {
    this.collection = db.collection('members');
  }

  /**
   * Fetch a member by their Discord ID
   * @param {string} discordId
   * @returns {Promise<Object|null>} Member document containing `ref` and `data()`, or null if not found.
   */
  async getMemberByDiscordId(discordId) {
    const snapshot = await this.collection.where('discordId', '==', discordId).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0];
  }

  /**
   * Check if an In-Game UID is already registered
   * @param {string} gameUid 
   * @returns {Promise<boolean>}
   */
  async checkUidExists(gameUid) {
    const snapshot = await this.collection.where('gameUid', '==', gameUid).get();
    return !snapshot.empty;
  }

  /**
   * Get all members
   * @returns {Promise<Array>} Array of member docs
   */
  async getAllMembers() {
    const snapshot = await this.collection.get();
    return snapshot.docs;
  }

  /**
   * Register a new member
   * @param {Object} data 
   */
  async registerMember(data) {
    return await this.collection.add(data);
  }

  /**
   * Update an existing member's document
   * @param {string} discordId 
   * @param {Object} updates 
   */
  async updateMember(discordId, updates) {
    const memberDoc = await this.getMemberByDiscordId(discordId);
    if (!memberDoc) throw new Error('Member not found');
    return await memberDoc.ref.update(updates);
  }

  /**
   * Delete a member from the database
   * @param {string} discordId 
   */
  async deleteMember(discordId) {
    const memberDoc = await this.getMemberByDiscordId(discordId);
    if (memberDoc) {
      await memberDoc.ref.delete();
      return true;
    }
    return false;
  }
}

module.exports = new MemberService();
