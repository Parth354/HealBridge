/**
 * External API Integration Service
 * 
 * Purpose:
 * - Integrate with Google Maps API for location services
 * - Integrate with Twilio for SMS
 * - Integrate with SendGrid for email (alternative to nodemailer)
 * - Integrate with other third-party services
 * - Provide unified interface for external APIs
 * - Handle rate limiting and error handling
 */

import axios from 'axios';
import config from '../config/env.js';
import twilio from 'twilio';

class ExternalService {
  constructor() {
    // Initialize Twilio
    this.twilioClient = null;
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio client initialized');
    }

    // Google Maps API Key
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    // SendGrid API Key
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;

    // Rate limiting trackers
    this.rateLimits = {
      googleMaps: { count: 0, resetTime: Date.now() + 60000 },
      twilioSMS: { count: 0, resetTime: Date.now() + 60000 }
    };
  }

  /**
   * Google Maps Integration
   */

  /**
   * Get distance and duration between two locations
   * @param {Object} origin - Origin coordinates {lat, lon}
   * @param {Object} destination - Destination coordinates {lat, lon}
   * @returns {Promise<Object>} Distance and duration
   */
  async getDistanceMatrix(origin, destination) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      this.checkRateLimit('googleMaps', 100); // 100 requests per minute

      const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const response = await axios.get(url, {
        params: {
          origins: `${origin.lat},${origin.lon}`,
          destinations: `${destination.lat},${destination.lon}`,
          key: this.googleMapsApiKey,
          mode: 'driving',
          units: 'metric'
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const element = response.data.rows[0]?.elements[0];

      if (!element || element.status !== 'OK') {
        throw new Error('Unable to calculate distance');
      }

      return {
        distance: {
          text: element.distance.text,
          value: element.distance.value // meters
        },
        duration: {
          text: element.duration.text,
          value: element.duration.value // seconds
        }
      };
    } catch (error) {
      console.error('Google Maps Distance Matrix error:', error);
      throw error;
    }
  }

  /**
   * Get place details from Google Maps
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>} Place details
   */
  async getPlaceDetails(placeId) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      const response = await axios.get(url, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,geometry,formatted_phone_number,rating,opening_hours',
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Google Maps Place Details error:', error);
      throw error;
    }
  }

  /**
   * Search for places near a location
   * @param {Object} location - {lat, lon}
   * @param {string} keyword - Search keyword
   * @param {number} radius - Search radius in meters
   * @returns {Promise<Array>} Array of places
   */
  async searchNearbyPlaces(location, keyword = 'hospital', radius = 5000) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      const response = await axios.get(url, {
        params: {
          location: `${location.lat},${location.lon}`,
          radius,
          keyword,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      return response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity,
        location: place.geometry.location,
        rating: place.rating,
        isOpen: place.opening_hours?.open_now
      }));
    } catch (error) {
      console.error('Google Maps Nearby Search error:', error);
      throw error;
    }
  }

  /**
   * Geocode an address to coordinates
   * @param {string} address - Address string
   * @returns {Promise<Object>} Coordinates {lat, lon}
   */
  async geocodeAddress(address) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const response = await axios.get(url, {
        params: {
          address,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding error: ${response.data.status}`);
      }

      const location = response.data.results[0].geometry.location;
      
      return {
        lat: location.lat,
        lon: location.lng,
        formattedAddress: response.data.results[0].formatted_address,
        placeId: response.data.results[0].place_id
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Address details
   */
  async reverseGeocode(lat, lon) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json';
      const response = await axios.get(url, {
        params: {
          latlng: `${lat},${lon}`,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Reverse geocoding error: ${response.data.status}`);
      }

      const result = response.data.results[0];
      
      return {
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        placeId: result.place_id
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Twilio Integration
   */

  /**
   * Send SMS via Twilio
   * @param {string} to - Phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(to, message) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      this.checkRateLimit('twilioSMS', 50); // 50 SMS per minute

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to
      });

      console.log(`✅ SMS sent to ${to}: ${result.sid}`);

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        dateCreated: result.dateCreated
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }

  /**
   * Get SMS delivery status
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<Object>} Status details
   */
  async getSMSStatus(messageSid) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const message = await this.twilioClient.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit
      };
    } catch (error) {
      console.error('Twilio status fetch error:', error);
      throw error;
    }
  }

  /**
   * Make a phone call via Twilio
   * @param {string} to - Phone number
   * @param {string} twimlUrl - TwiML URL for call instructions
   * @returns {Promise<Object>} Call result
   */
  async makeCall(to, twimlUrl) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const call = await this.twilioClient.calls.create({
        url: twimlUrl,
        to,
        from: config.TWILIO_PHONE_NUMBER
      });

      return {
        success: true,
        sid: call.sid,
        status: call.status
      };
    } catch (error) {
      console.error('Twilio call error:', error);
      throw error;
    }
  }

  /**
   * SendGrid Integration
   */

  /**
   * Send email via SendGrid
   * @param {Object} emailData - Email details
   * @returns {Promise<Object>} Send result
   */
  async sendEmailViaSendGrid(emailData) {
    if (!this.sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const { to, from, subject, text, html, attachments = [] } = emailData;

    try {
      const url = 'https://api.sendgrid.com/v3/mail/send';
      
      const payload = {
        personalizations: [{
          to: [{ email: to }],
          subject
        }],
        from: { email: from || 'noreply@healbridge.com' },
        content: [
          { type: 'text/plain', value: text || '' },
          { type: 'text/html', value: html || '' }
        ]
      };

      if (attachments.length > 0) {
        payload.attachments = attachments.map(att => ({
          content: att.content, // Base64 encoded
          filename: att.filename,
          type: att.type,
          disposition: 'attachment'
        }));
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Email sent via SendGrid to ${to}`);

      return {
        success: true,
        statusCode: response.status
      };
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  }

  /**
   * Other External Services
   */

  /**
   * Integrate with lab report APIs (placeholder)
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Lab reports
   */
  async fetchLabReports(patientId) {
    // Placeholder for lab integration
    // Would integrate with actual lab systems (HL7, FHIR, etc.)
    console.log(`Fetching lab reports for patient ${patientId}`);
    
    return {
      success: true,
      message: 'Lab integration not implemented',
      reports: []
    };
  }

  /**
   * Verify insurance (placeholder)
   * @param {Object} insuranceData - Insurance details
   * @returns {Promise<Object>} Verification result
   */
  async verifyInsurance(insuranceData) {
    // Placeholder for insurance verification API
    console.log('Verifying insurance:', insuranceData);

    return {
      success: true,
      verified: false,
      message: 'Insurance verification not implemented'
    };
  }

  /**
   * Integrate with pharmacy systems (placeholder)
   * @param {Object} prescriptionData - Prescription details
   * @returns {Promise<Object>} Result
   */
  async sendToPharmacy(prescriptionData) {
    // Placeholder for pharmacy integration (e.g., SureScripts)
    console.log('Sending prescription to pharmacy:', prescriptionData);

    return {
      success: true,
      message: 'Pharmacy integration not implemented'
    };
  }

  /**
   * Rate limiting helper
   */
  checkRateLimit(service, limit) {
    const now = Date.now();
    const tracker = this.rateLimits[service];

    if (!tracker) {
      this.rateLimits[service] = { count: 1, resetTime: now + 60000 };
      return;
    }

    if (now > tracker.resetTime) {
      tracker.count = 1;
      tracker.resetTime = now + 60000;
      return;
    }

    if (tracker.count >= limit) {
      throw new Error(`Rate limit exceeded for ${service}. Please try again later.`);
    }

    tracker.count++;
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      googleMaps: {
        configured: !!this.googleMapsApiKey,
        status: this.googleMapsApiKey ? 'active' : 'not_configured'
      },
      twilio: {
        configured: !!this.twilioClient,
        status: this.twilioClient ? 'active' : 'not_configured'
      },
      sendGrid: {
        configured: !!this.sendGridApiKey,
        status: this.sendGridApiKey ? 'active' : 'not_configured'
      },
      labSystems: {
        configured: false,
        status: 'not_implemented'
      },
      insurance: {
        configured: false,
        status: 'not_implemented'
      },
      pharmacy: {
        configured: false,
        status: 'not_implemented'
      }
    };
  }

  /**
   * Test all integrations
   */
  async testIntegrations() {
    const results = {};

    // Test Google Maps
    if (this.googleMapsApiKey) {
      try {
        await this.geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA');
        results.googleMaps = { status: 'working', message: 'Successfully tested geocoding' };
      } catch (error) {
        results.googleMaps = { status: 'error', message: error.message };
      }
    } else {
      results.googleMaps = { status: 'not_configured' };
    }

    // Test Twilio
    if (this.twilioClient) {
      try {
        // Just check if client is initialized (don't send actual SMS in test)
        results.twilio = { status: 'configured', message: 'Client initialized' };
      } catch (error) {
        results.twilio = { status: 'error', message: error.message };
      }
    } else {
      results.twilio = { status: 'not_configured' };
    }

    // Test SendGrid
    if (this.sendGridApiKey) {
      results.sendGrid = { status: 'configured', message: 'API key present' };
    } else {
      results.sendGrid = { status: 'not_configured' };
    }

    return results;
  }
}

export default new ExternalService();

