import axios from 'axios';

class TriageService {
  constructor() {
    // Symptom to specialty mapping with urgency levels
    this.symptomMap = {
      'chest pain': { specialty: 'Cardiology', urgency: 'IMMEDIATE', keywords: ['chest', 'heart', 'pressure'] },
      'breathing difficulty': { specialty: 'Pulmonology', urgency: 'IMMEDIATE', keywords: ['breath', 'suffocate', 'oxygen'] },
      'severe headache': { specialty: 'Neurology', urgency: 'IMMEDIATE', keywords: ['headache', 'migraine', 'dizzy'] },
      'fever': { specialty: 'General Medicine', urgency: 'SCHEDULED', keywords: ['fever', 'temperature', 'hot'] },
      'cold': { specialty: 'General Medicine', urgency: 'SCHEDULED', keywords: ['cold', 'cough', 'sneeze'] },
      'stomach pain': { specialty: 'Gastroenterology', urgency: 'SCHEDULED', keywords: ['stomach', 'abdomen', 'belly'] },
      'skin rash': { specialty: 'Dermatology', urgency: 'SCHEDULED', keywords: ['skin', 'rash', 'itch', 'allergy'] },
      'dental pain': { specialty: 'Dentistry', urgency: 'SCHEDULED', keywords: ['tooth', 'dental', 'gum'] },
      'eye problem': { specialty: 'Ophthalmology', urgency: 'SCHEDULED', keywords: ['eye', 'vision', 'sight'] },
      'bone fracture': { specialty: 'Orthopedics', urgency: 'IMMEDIATE', keywords: ['bone', 'fracture', 'break', 'joint'] },
      'pregnancy': { specialty: 'Gynecology', urgency: 'SCHEDULED', keywords: ['pregnant', 'pregnancy', 'baby'] },
      'mental health': { specialty: 'Psychiatry', urgency: 'SCHEDULED', keywords: ['anxiety', 'depression', 'stress', 'mental'] },
      'diabetes': { specialty: 'Endocrinology', urgency: 'SCHEDULED', keywords: ['diabetes', 'sugar', 'insulin'] },
      'kidney': { specialty: 'Nephrology', urgency: 'SCHEDULED', keywords: ['kidney', 'urine', 'urination'] },
      'checkup': { specialty: 'General Medicine', urgency: 'SCHEDULED', keywords: ['checkup', 'routine', 'general'] }
    };
  }

  // Analyze symptoms and suggest specialty + urgency
  async analyzeSymptomsSimple(symptoms) {
    const lowerSymptoms = symptoms.toLowerCase();
    let bestMatch = { specialty: 'General Medicine', urgency: 'SCHEDULED', confidence: 0 };

    // Simple keyword matching
    for (const [condition, config] of Object.entries(this.symptomMap)) {
      let matchScore = 0;
      for (const keyword of config.keywords) {
        if (lowerSymptoms.includes(keyword)) {
          matchScore++;
        }
      }
      
      if (matchScore > bestMatch.confidence) {
        bestMatch = {
          specialty: config.specialty,
          urgency: config.urgency,
          confidence: matchScore,
          condition
        };
      }
    }

    return {
      specialty: bestMatch.specialty,
      urgency: bestMatch.urgency,
      confidence: bestMatch.confidence > 0 ? 'HIGH' : 'LOW',
      suggestedCondition: bestMatch.condition || 'General checkup',
      recommendations: this.getRecommendations(bestMatch.urgency)
    };
  }

  // AI-powered triage using OpenAI (optional, more advanced)
  async analyzeSymptomsAI(symptoms) {
    try {
      // This would integrate with OpenAI API
      // For now, fallback to simple matching
      return await this.analyzeSymptomsSimple(symptoms);
    } catch (error) {
      console.error('AI triage failed, using fallback:', error);
      return await this.analyzeSymptomsSimple(symptoms);
    }
  }

  getRecommendations(urgency) {
    const recommendations = {
      'IMMEDIATE': [
        'Seek immediate medical attention',
        'Consider emergency services if symptoms worsen',
        'Book the earliest available slot'
      ],
      'SCHEDULED': [
        'Book an appointment at your convenience',
        'Monitor symptoms for any changes',
        'Keep a log of when symptoms occur'
      ],
      'HOUSE_VISIT': [
        'A home visit may be more comfortable',
        'Ensure someone is present during the visit',
        'Prepare any previous medical records'
      ]
    };

    return recommendations[urgency] || recommendations['SCHEDULED'];
  }

  // Get category buckets
  getCategories() {
    return [
      {
        id: 'IMMEDIATE',
        name: 'Immediate Care',
        description: 'Get help right now for urgent symptoms',
        icon: 'alert-circle',
        color: '#FF4444'
      },
      {
        id: 'SCHEDULED',
        name: 'Book Appointment',
        description: 'Schedule a visit at your convenience',
        icon: 'calendar',
        color: '#4444FF'
      },
      {
        id: 'HOUSE',
        name: 'House Visit',
        description: 'Get doctor consultation at home',
        icon: 'home',
        color: '#44AA44'
      }
    ];
  }
}

export default new TriageService();

