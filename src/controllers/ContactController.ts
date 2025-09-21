import { Request, Response } from 'express';
import { ContactService } from '../services/ContactService';
import { IdentifyRequest, IdentifyResponse } from '../models/Contact';

export class ContactController {
  private contactService: ContactService;

  constructor(contactService: ContactService) {
    this.contactService = contactService;
  }

  async identify(req: Request, res: Response): Promise<void> {
    try {
      const { email, phoneNumber }: IdentifyRequest = req.body;

      // Validate that at least one of email or phoneNumber is provided
      if (!email && !phoneNumber) {
        res.status(400).json({
          error: 'At least one of email or phoneNumber must be provided'
        });
        return;
      }

      // Validate email format if provided
      if (email && !this.isValidEmail(email)) {
        res.status(400).json({
          error: 'Invalid email format'
        });
        return;
      }

      // Validate phoneNumber format if provided
      if (phoneNumber && !this.isValidPhoneNumber(phoneNumber)) {
        res.status(400).json({
          error: 'Invalid phone number format'
        });
        return;
      }

      const consolidatedContact = await this.contactService.identify({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined
      });

      const response: IdentifyResponse = {
        contact: consolidatedContact
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in identify endpoint:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getAllContacts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;

      // Validate parameters
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Limit must be between 1 and 100'
        });
        return;
      }

      if (page < 1) {
        res.status(400).json({
          error: 'Page must be greater than 0'
        });
        return;
      }

      const result = await this.contactService.getAllContacts(limit, page);

      res.status(200).json({
        success: true,
        data: result.contacts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getAllContacts endpoint:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Allow digits, spaces, hyphens, parentheses, and plus signs
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phoneNumber) && phoneNumber.replace(/\D/g, '').length >= 6;
  }
}
