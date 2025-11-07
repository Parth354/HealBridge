/**
 * Search Service - Advanced Doctor Discovery
 * 
 * Purpose:
 * - Advanced filtering for doctor search (specialty, location, rating, availability)
 * - Geolocation-based search with distance calculation
 * - Search result ranking algorithm
 * - Search analytics and optimization
 * - Cached results for performance
 */

import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';
import { calculateDistance } from '../utils/geo.js';

class SearchService {
  constructor() {
    this.CACHE_TTL = 600; // 10 minutes
    this.CACHE_PREFIX = 'search:';
    this.DEFAULT_MAX_DISTANCE = 50; // km
    this.DEFAULT_LIMIT = 20;
  }

  /**
   * Advanced doctor search with multiple filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Filtered and ranked doctors
   */
  async searchDoctors(filters) {
    const {
      specialty,
      lat,
      lon,
      visitType,
      date,
      minRating = 0,
      maxDistance = this.DEFAULT_MAX_DISTANCE,
      sortBy = 'distance',
      limit = this.DEFAULT_LIMIT,
      offset = 0,
      insuranceAccepted,
      language,
      gender,
      experienceYears,
      consultationFee
    } = filters;

    // Check cache first
    const cacheKey = this.generateCacheKey(filters);
    const cached = await this.getCachedResults(cacheKey);
    if (cached) {
      console.log(`✅ Cache hit for search: ${cacheKey}`);
      return cached;
    }

    try {
      // Build base query
      const whereConditions = {
        verifiedStatus: 'VERIFIED'
      };

      // Specialty filter
      if (specialty) {
        whereConditions.specialties = {
          has: specialty
        };
      }

      // Rating filter
      if (minRating > 0) {
        whereConditions.rating = {
          gte: minRating
        };
      }

      // Experience filter
      if (experienceYears) {
        // Note: You'd need to add an experienceYears field to the Doctor model
        // For now, this is a placeholder
      }

      // Get doctors with clinics
      let doctors = await prisma.doctor.findMany({
        where: whereConditions,
        include: {
          user: true,
          clinics: {
            where: {
              active: true
            }
          },
          schedules: date ? {
            where: {
              dayOfWeek: new Date(date).getDay(),
              isActive: true
            }
          } : true
        },
        take: limit * 2, // Get more to account for distance filtering
        skip: offset
      });

      // Filter by location if coordinates provided
      if (lat && lon) {
        doctors = this.filterByDistance(doctors, lat, lon, maxDistance);
      }

      // Filter by visit type
      if (visitType) {
        doctors = doctors.filter(doctor =>
          doctor.clinics.some(clinic =>
            clinic.visitTypes && clinic.visitTypes.includes(visitType)
          )
        );
      }

      // Filter by availability on specific date
      if (date) {
        doctors = await this.filterByAvailability(doctors, date);
      }

      // Apply additional filters
      if (insuranceAccepted) {
        doctors = doctors.filter(doctor =>
          doctor.insuranceAccepted?.includes(insuranceAccepted)
        );
      }

      if (language) {
        doctors = doctors.filter(doctor =>
          doctor.languages?.includes(language)
        );
      }

      // Rank and sort results
      const rankedDoctors = this.rankDoctors(doctors, {
        sortBy,
        userLat: lat,
        userLon: lon,
        specialty,
        visitType
      });

      // Limit final results
      const finalResults = rankedDoctors.slice(0, limit);

      // Format results
      const formattedResults = finalResults.map(doctor => this.formatDoctorResult(doctor));

      // Cache results
      await this.cacheResults(cacheKey, formattedResults);

      // Log search analytics
      await this.logSearchAnalytics(filters, formattedResults.length);

      return {
        results: formattedResults,
        total: formattedResults.length,
        filters: filters,
        cached: false
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Filter doctors by distance from user location
   */
  filterByDistance(doctors, userLat, userLon, maxDistance) {
    return doctors
      .map(doctor => {
        // Calculate distance to nearest clinic
        const clinicsWithDistance = doctor.clinics
          .filter(clinic => clinic.lat && clinic.lon)
          .map(clinic => ({
            ...clinic,
            distance: calculateDistance(userLat, userLon, clinic.lat, clinic.lon)
          }))
          .sort((a, b) => a.distance - b.distance);

        if (clinicsWithDistance.length === 0) return null;

        return {
          ...doctor,
          clinics: clinicsWithDistance,
          nearestDistance: clinicsWithDistance[0].distance
        };
      })
      .filter(doctor => doctor && doctor.nearestDistance <= maxDistance)
      .sort((a, b) => a.nearestDistance - b.nearestDistance);
  }

  /**
   * Filter doctors by availability on a specific date
   */
  async filterByAvailability(doctors, date) {
    const availableDoctors = [];

    for (const doctor of doctors) {
      const hasAvailability = await this.checkDoctorAvailability(doctor.id, date);
      if (hasAvailability) {
        availableDoctors.push(doctor);
      }
    }

    return availableDoctors;
  }

  /**
   * Check if doctor has available slots on a date
   */
  async checkDoctorAvailability(doctorId, date) {
    const dayOfWeek = new Date(date).getDay();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if doctor has schedule for this day
    const schedules = await prisma.schedule.findMany({
      where: {
        doctor_id: doctorId,
        dayOfWeek: dayOfWeek,
        isActive: true
      }
    });

    if (schedules.length === 0) return false;

    // Check for existing appointments
    const appointments = await prisma.appointment.count({
      where: {
        doctor_id: doctorId,
        startTs: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['CONFIRMED', 'HOLD']
        }
      }
    });

    // Calculate total slots available
    const totalSlots = schedules.reduce((sum, schedule) => {
      const duration = 15; // minutes per slot (could be doctor-specific)
      const scheduleMinutes = (schedule.endTime - schedule.startTime) / (1000 * 60);
      return sum + Math.floor(scheduleMinutes / duration);
    }, 0);

    return appointments < totalSlots;
  }

  /**
   * Rank doctors based on multiple factors
   */
  rankDoctors(doctors, options) {
    const { sortBy, userLat, userLon, specialty, visitType } = options;

    return doctors.sort((a, b) => {
      // Custom ranking algorithm
      switch (sortBy) {
        case 'distance':
          return (a.nearestDistance || Infinity) - (b.nearestDistance || Infinity);
        
        case 'rating':
          return b.rating - a.rating;
        
        case 'experience':
          return (b.avgConsultMin || 0) - (a.avgConsultMin || 0); // Placeholder
        
        case 'availability':
          // Prefer doctors with more availability
          return 0; // Would need to calculate available slots
        
        case 'recommended':
          // Complex ranking considering multiple factors
          const scoreA = this.calculateRecommendationScore(a, options);
          const scoreB = this.calculateRecommendationScore(b, options);
          return scoreB - scoreA;
        
        default:
          return 0;
      }
    });
  }

  /**
   * Calculate recommendation score for ranking
   */
  calculateRecommendationScore(doctor, options) {
    let score = 0;

    // Rating weight (40%)
    score += doctor.rating * 40;

    // Distance weight (30%)
    if (doctor.nearestDistance !== undefined) {
      const distanceScore = Math.max(0, 30 * (1 - doctor.nearestDistance / 50));
      score += distanceScore;
    }

    // Specialty match weight (20%)
    if (options.specialty && doctor.specialties.includes(options.specialty)) {
      score += 20;
    }

    // Visit type availability weight (10%)
    if (options.visitType && doctor.clinics.some(c => c.visitTypes?.includes(options.visitType))) {
      score += 10;
    }

    return score;
  }

  /**
   * Format doctor result for API response
   */
  formatDoctorResult(doctor) {
    return {
      id: doctor.id,
      name: doctor.user.email || 'Doctor', // Should be replaced with actual name
      specialties: doctor.specialties,
      rating: doctor.rating,
      avgConsultMin: doctor.avgConsultMin,
      licenseNo: doctor.licenseNo,
      clinics: doctor.clinics.map(clinic => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        lat: clinic.lat,
        lon: clinic.lon,
        distance: clinic.distance || null,
        visitTypes: clinic.visitTypes,
        contactNo: clinic.contactNo
      })),
      nearestClinic: doctor.clinics[0] || null,
      distance: doctor.nearestDistance || null,
      availableToday: true // Would be calculated based on actual availability
    };
  }

  /**
   * Quick search for doctors by name or specialty
   */
  async quickSearch(query, options = {}) {
    const { limit = 10, lat, lon } = options;

    try {
      const doctors = await prisma.doctor.findMany({
        where: {
          OR: [
            {
              specialties: {
                hasSome: [query]
              }
            },
            {
              user: {
                email: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          ],
          verifiedStatus: 'VERIFIED'
        },
        include: {
          user: true,
          clinics: {
            where: { active: true }
          }
        },
        take: limit
      });

      // Add distance if coordinates provided
      let results = doctors;
      if (lat && lon) {
        results = this.filterByDistance(doctors, lat, lon, 100); // 100km max for quick search
      }

      return results.map(doctor => this.formatDoctorResult(doctor));
    } catch (error) {
      console.error('Quick search error:', error);
      throw error;
    }
  }

  /**
   * Get popular specialties
   */
  async getPopularSpecialties() {
    try {
      const cacheKey = `${this.CACHE_PREFIX}popular_specialties`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get all doctors and count specialties
      const doctors = await prisma.doctor.findMany({
        where: { verifiedStatus: 'VERIFIED' },
        select: { specialties: true }
      });

      const specialtyCount = {};
      doctors.forEach(doctor => {
        doctor.specialties.forEach(specialty => {
          specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;
        });
      });

      const popularSpecialties = Object.entries(specialtyCount)
        .map(([specialty, count]) => ({ specialty, doctorCount: count }))
        .sort((a, b) => b.doctorCount - a.doctorCount)
        .slice(0, 20);

      // Cache for 1 hour
      await redisClient.setex(cacheKey, 3600, JSON.stringify(popularSpecialties));

      return popularSpecialties;
    } catch (error) {
      console.error('Error getting popular specialties:', error);
      return [];
    }
  }

  /**
   * Get trending doctors (most booked recently)
   */
  async getTrendingDoctors(options = {}) {
    const { limit = 10, lat, lon } = options;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get doctors with most appointments in last 30 days
      const doctors = await prisma.doctor.findMany({
        where: { verifiedStatus: 'VERIFIED' },
        include: {
          user: true,
          clinics: { where: { active: true } },
          appointments: {
            where: {
              startTs: { gte: thirtyDaysAgo },
              status: 'COMPLETED'
            }
          }
        },
        take: limit * 2
      });

      // Sort by appointment count
      const sorted = doctors
        .map(doctor => ({
          ...doctor,
          recentAppointments: doctor.appointments.length
        }))
        .sort((a, b) => b.recentAppointments - a.recentAppointments)
        .slice(0, limit);

      // Add distance if coordinates provided
      let results = sorted;
      if (lat && lon) {
        results = this.filterByDistance(sorted, lat, lon, 100);
      }

      return results.map(doctor => this.formatDoctorResult(doctor));
    } catch (error) {
      console.error('Error getting trending doctors:', error);
      return [];
    }
  }

  /**
   * Cache management
   */
  generateCacheKey(filters) {
    return `${this.CACHE_PREFIX}${JSON.stringify(filters)}`;
  }

  async getCachedResults(key) {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async cacheResults(key, results) {
    try {
      await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(results));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Search analytics logging
   */
  async logSearchAnalytics(filters, resultCount) {
    try {
      // Log to database or analytics service
      console.log(`🔍 Search: ${JSON.stringify(filters)} - ${resultCount} results`);
      
      // Could store in a separate analytics table or send to analytics service
    } catch (error) {
      console.error('Analytics logging error:', error);
    }
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions(query, type = 'all') {
    try {
      const suggestions = [];

      // Specialty suggestions
      if (type === 'all' || type === 'specialty') {
        const specialties = await this.getPopularSpecialties();
        const matchingSpecialties = specialties
          .filter(s => s.specialty.toLowerCase().includes(query.toLowerCase()))
          .map(s => ({ type: 'specialty', value: s.specialty, count: s.doctorCount }));
        suggestions.push(...matchingSpecialties);
      }

      // Doctor name suggestions (would need to add doctor names to schema)
      // ...

      return suggestions.slice(0, 10);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  async clearSearchCache(pattern = '*') {
    try {
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}${pattern}`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
        console.log(`✅ Cleared ${keys.length} search cache entries`);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export default new SearchService();

