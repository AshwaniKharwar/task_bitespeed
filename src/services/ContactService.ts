import { Database } from '../database/Database';
import { Contact, CreateContactData, IdentifyRequest, ConsolidatedContact } from '../models/Contact';

export class ContactService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
    const { email, phoneNumber } = request;

    // Find existing contacts that match email or phone
    const existingContacts = await this.db.findContactsByEmailOrPhone(email, phoneNumber);

    if (existingContacts.length === 0) {
      // No existing contacts - create new primary contact
      const newContact = await this.db.createContact({
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkPrecedence: 'primary'
      });

      return this.buildConsolidatedContact([newContact]);
    }

    // Get all primary contacts from existing matches
    const primaryContacts = existingContacts.filter(c => c.linkPrecedence === 'primary');
    const secondaryContacts = existingContacts.filter(c => c.linkPrecedence === 'secondary');

    // Get the primary IDs from secondary contacts
    const primaryIdsFromSecondary = secondaryContacts
      .map(c => c.linkedId)
      .filter(id => id !== null) as number[];

    // Collect all unique primary contact IDs
    const allPrimaryIds = new Set([
      ...primaryContacts.map(c => c.id),
      ...primaryIdsFromSecondary
    ]);

    if (allPrimaryIds.size === 0) {
      // This shouldn't happen, but handle gracefully
      throw new Error('No primary contacts found');
    }

    if (allPrimaryIds.size === 1) {
      // All contacts belong to the same primary - check if we need to create a new secondary
      const primaryId = Array.from(allPrimaryIds)[0];
      const allLinkedContacts = await this.db.findAllLinkedContacts(primaryId);
      
      const needsNewContact = this.needsNewSecondaryContact(allLinkedContacts, email, phoneNumber);
      
      if (needsNewContact) {
        const newSecondary = await this.db.createContact({
          email: email || null,
          phoneNumber: phoneNumber || null,
          linkedId: primaryId,
          linkPrecedence: 'secondary'
        });
        allLinkedContacts.push(newSecondary);
      }

      return this.buildConsolidatedContact(allLinkedContacts);
    }

    // Multiple primary contacts need to be merged
    return await this.mergePrimaryContacts(Array.from(allPrimaryIds), email, phoneNumber);
  }

  private needsNewSecondaryContact(existingContacts: Contact[], email?: string, phoneNumber?: string): boolean {
    // Check if the exact combination of email and phoneNumber already exists
    const exactMatch = existingContacts.some(contact => 
      contact.email === (email || null) && 
      contact.phoneNumber === (phoneNumber || null)
    );

    if (exactMatch) {
      return false;
    }

    // Check if this request brings new information
    const hasNewEmail = Boolean(email && !existingContacts.some(c => c.email === email));
    const hasNewPhone = Boolean(phoneNumber && !existingContacts.some(c => c.phoneNumber === phoneNumber));

    return hasNewEmail || hasNewPhone;
  }

  private async mergePrimaryContacts(primaryIds: number[], email?: string, phoneNumber?: string): Promise<ConsolidatedContact> {
    // Get all contacts for each primary ID
    const allContactsGroups = await Promise.all(
      primaryIds.map(id => this.db.findAllLinkedContacts(id))
    );

    // Flatten all contacts and find the oldest primary
    const allContacts = allContactsGroups.flat();
    const primaryContacts = allContacts.filter(c => c.linkPrecedence === 'primary');
    
    // Sort by creation date to find the oldest primary
    primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const oldestPrimary = primaryContacts[0];

    // Convert all other primaries to secondary
    for (const primary of primaryContacts) {
      if (primary.id !== oldestPrimary.id) {
        await this.db.updateContact(primary.id, {
          linkedId: oldestPrimary.id,
          linkPrecedence: 'secondary'
        });
        primary.linkedId = oldestPrimary.id;
        primary.linkPrecedence = 'secondary';
      }
    }

    // Update all secondary contacts to link to the oldest primary
    const secondaryContacts = allContacts.filter(c => c.linkPrecedence === 'secondary');
    for (const secondary of secondaryContacts) {
      if (secondary.linkedId !== oldestPrimary.id) {
        await this.db.updateContact(secondary.id, {
          linkedId: oldestPrimary.id
        });
        secondary.linkedId = oldestPrimary.id;
      }
    }

    // Check if we need to create a new secondary contact
    const needsNewContact = this.needsNewSecondaryContact(allContacts, email, phoneNumber);
    
    if (needsNewContact) {
      const newSecondary = await this.db.createContact({
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: oldestPrimary.id,
        linkPrecedence: 'secondary'
      });
      allContacts.push(newSecondary);
    }

    return this.buildConsolidatedContact(allContacts);
  }

  async getAllContacts(limit: number = 50, page: number = 1): Promise<{
    contacts: Contact[],
    pagination: {
      currentPage: number,
      totalPages: number,
      totalContacts: number,
      limit: number,
      hasNext: boolean,
      hasPrevious: boolean
    }
  }> {
    const offset = (page - 1) * limit;
    const result = await this.db.getAllContacts(limit, offset);
    
    const totalPages = Math.ceil(result.total / limit);
    
    return {
      contacts: result.contacts,
      pagination: {
        currentPage: page,
        totalPages,
        totalContacts: result.total,
        limit,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  private buildConsolidatedContact(contacts: Contact[]): ConsolidatedContact {
    // Sort contacts by creation date
    contacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const primary = contacts.find(c => c.linkPrecedence === 'primary');
    if (!primary) {
      throw new Error('No primary contact found');
    }

    const secondaryContacts = contacts.filter(c => c.linkPrecedence === 'secondary');

    // Collect unique emails and phone numbers, with primary first
    const emails: string[] = [];
    const phoneNumbers: string[] = [];

    // Add primary contact's email and phone first
    if (primary.email) {
      emails.push(primary.email);
    }
    if (primary.phoneNumber) {
      phoneNumbers.push(primary.phoneNumber);
    }

    // Add secondary contacts' emails and phones (avoid duplicates)
    for (const contact of secondaryContacts) {
      if (contact.email && !emails.includes(contact.email)) {
        emails.push(contact.email);
      }
      if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
        phoneNumbers.push(contact.phoneNumber);
      }
    }

    return {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryContacts.map(c => c.id)
    };
  }
}
