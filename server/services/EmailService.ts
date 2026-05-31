/**
 * Email Service
 *
 * Handles sending transactional emails using the Resend SDK.
 * Used for business claim notifications.
 *
 * Email types:
 * - Claim submission confirmation (to claimant)
 * - Claim approved notification (to claimant)
 * - Claim rejected notification (to claimant)
 * - New claim alert (to admin)
 */

import { Resend } from 'resend'
import { consola } from 'consola'

interface EmailServiceConfig {
  apiKey: string
  fromEmail: string
  siteName: string
  siteUrl: string
}

interface ClaimEmailData {
  claimantEmail: string
  claimantName: string | null
  businessName: string
  businessSlug?: string
}

interface VerificationEmailData extends ClaimEmailData {
  verificationToken: string
}

interface ActivationEmailData extends ClaimEmailData {
  activationToken: string
}

interface RejectionEmailData extends ClaimEmailData {
  rejectionReason?: string | null
}

export class EmailService {
  private resend: Resend
  private fromEmail: string
  private siteName: string
  private siteUrl: string

  constructor(config: EmailServiceConfig) {
    this.resend = new Resend(config.apiKey)
    this.fromEmail = config.fromEmail
    this.siteName = config.siteName
    this.siteUrl = config.siteUrl
  }

  /**
   * Send email verification request to the claimant
   * This is sent when a new claim is submitted with status='unverified'
   */
  async sendClaimSubmittedEmail(data: VerificationEmailData): Promise<boolean> {
    const { claimantEmail, claimantName, businessName, verificationToken } = data
    const displayName = claimantName || 'there'
    const verificationUrl = `${this.siteUrl}/claim/verify?token=${verificationToken}`

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.siteName} <${this.fromEmail}>`,
        to: claimantEmail,
        subject: `Verify your email to claim ${businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Verify Your Email</h1>
            <p>Hi ${displayName},</p>
            <p>Thank you for submitting a claim for <strong>${businessName}</strong>.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="margin: 24px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify My Email
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Best regards,<br />
              The ${this.siteName} Team
            </p>
          </div>
        `,
      })

      if (error) {
        consola.error('EmailService.sendClaimSubmittedEmail - Failed:', error)
        return false
      }

      if (import.meta.dev) {
        consola.success(`EmailService - Verification email sent to ${claimantEmail}`)
      }
      return true
    } catch (err) {
      consola.error('EmailService.sendClaimSubmittedEmail - Error:', err)
      return false
    }
  }

  /**
   * Send claim approved notification with account activation link
   * This is sent when an admin approves a claim
   */
  async sendClaimApprovedEmail(data: ActivationEmailData): Promise<boolean> {
    const { claimantEmail, claimantName, businessName, activationToken } = data
    const displayName = claimantName || 'there'
    const activationUrl = `${this.siteUrl}/claim/activate?token=${activationToken}`

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.siteName} <${this.fromEmail}>`,
        to: claimantEmail,
        subject: `Your claim for ${businessName} has been approved!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Claim Approved!</h1>
            <p>Hi ${displayName},</p>
            <p>Great news! Your claim for <strong>${businessName}</strong> has been approved.</p>
            <p>Click the button below to set up your password and activate your account:</p>
            <p style="margin: 24px 0;">
              <a href="${activationUrl}"
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Activate My Account
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
            <p>Once activated, you'll be able to:</p>
            <ul>
              <li>Update your business information</li>
              <li>Edit your company description</li>
              <li>Manage contact details</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Best regards,<br />
              The ${this.siteName} Team
            </p>
          </div>
        `,
      })

      if (error) {
        consola.error('EmailService.sendClaimApprovedEmail - Failed:', error)
        return false
      }

      if (import.meta.dev) {
        consola.success(`EmailService - Activation email sent to ${claimantEmail}`)
      }
      return true
    } catch (err) {
      consola.error('EmailService.sendClaimApprovedEmail - Error:', err)
      return false
    }
  }

  /**
   * Send claim approved notification for authenticated users (no activation needed)
   * This is sent when an admin approves a claim from a user who is already logged in
   */
  async sendClaimApprovedAuthenticatedEmail(data: BaseClaimEmailData): Promise<boolean> {
    const { claimantEmail, claimantName, businessName } = data
    const displayName = claimantName || 'there'
    const dashboardUrl = `${this.siteUrl}/owner`

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.siteName} <${this.fromEmail}>`,
        to: claimantEmail,
        subject: `Your claim for ${businessName} has been approved!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Claim Approved!</h1>
            <p>Hi ${displayName},</p>
            <p>Great news! Your claim for <strong>${businessName}</strong> has been approved.</p>
            <p>You can now manage your business profile from your dashboard:</p>
            <p style="margin: 24px 0;">
              <a href="${dashboardUrl}"
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p>From your dashboard, you'll be able to:</p>
            <ul>
              <li>Update your business information</li>
              <li>Edit your company description</li>
              <li>Manage contact details</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Best regards,<br />
              The ${this.siteName} Team
            </p>
          </div>
        `,
      })

      if (error) {
        consola.error('EmailService.sendClaimApprovedAuthenticatedEmail - Failed:', error)
        return false
      }

      if (import.meta.dev) {
        consola.success(`EmailService - Claim approved (authenticated) email sent to ${claimantEmail}`)
      }
      return true
    } catch (err) {
      consola.error('EmailService.sendClaimApprovedAuthenticatedEmail - Error:', err)
      return false
    }
  }

  /**
   * Send claim rejected notification to the claimant
   */
  async sendClaimRejectedEmail(data: RejectionEmailData): Promise<boolean> {
    const { claimantEmail, claimantName, businessName, rejectionReason } = data
    const displayName = claimantName || 'there'
    const reason = rejectionReason || 'Not specified'

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.siteName} <${this.fromEmail}>`,
        to: claimantEmail,
        subject: `Update on your claim for ${businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Claim Update</h1>
            <p>Hi ${displayName},</p>
            <p>Unfortunately, we were unable to approve your claim for <strong>${businessName}</strong> at this time.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you believe this was a mistake or have additional documentation to support your claim, please reply to this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Best regards,<br />
              The ${this.siteName} Team
            </p>
          </div>
        `,
      })

      if (error) {
        consola.error('EmailService.sendClaimRejectedEmail - Failed:', error)
        return false
      }

      if (import.meta.dev) {
        consola.success(`EmailService - Claim rejected email sent to ${claimantEmail}`)
      }
      return true
    } catch (err) {
      consola.error('EmailService.sendClaimRejectedEmail - Error:', err)
      return false
    }
  }

  /**
   * Send verification resend email for expired token flow
   */
  async sendVerificationResendEmail(data: VerificationEmailData): Promise<boolean> {
    const { claimantEmail, claimantName, businessName, verificationToken } = data
    const displayName = claimantName || 'there'
    const verificationUrl = `${this.siteUrl}/claim/verify?token=${verificationToken}`

    try {
      const { error } = await this.resend.emails.send({
        from: `${this.siteName} <${this.fromEmail}>`,
        to: claimantEmail,
        subject: `New verification link for your ${businessName} claim`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">New Verification Link</h1>
            <p>Hi ${displayName},</p>
            <p>Here's a new verification link for your claim on <strong>${businessName}</strong>.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="margin: 24px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify My Email
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #666; font-size: 14px;">
              Best regards,<br />
              The ${this.siteName} Team
            </p>
          </div>
        `,
      })

      if (error) {
        consola.error('EmailService.sendVerificationResendEmail - Failed:', error)
        return false
      }

      if (import.meta.dev) {
        consola.success(`EmailService - Verification resend email sent to ${claimantEmail}`)
      }
      return true
    } catch (err) {
      consola.error('EmailService.sendVerificationResendEmail - Error:', err)
      return false
    }
  }
}

