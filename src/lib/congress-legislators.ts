/**
 * Congress Legislators Data Integration
 * 
 * This module integrates with the unitedstates/congress-legislators repository
 * to provide enhanced representative data including social media, contact info,
 * committee memberships, and comprehensive ID mappings.
 * 
 * Data sources:
 * - https://github.com/unitedstates/congress-legislators
 * - legislators-current.yaml: Current members of Congress
 * - legislators-social-media.yaml: Social media accounts
 */

import { cachedFetch } from '@/lib/cache'
import { structuredLogger } from '@/lib/logging/logger'
import yaml from 'js-yaml'
import type { EnhancedRepresentative } from '@/types/representative'

// Base URLs for congress-legislators data
const CONGRESS_LEGISLATORS_BASE_URL = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main'

// Interfaces for congress-legislators data
export interface CongressLegislatorId {
  bioguide: string
  thomas?: string
  lis?: string
  govtrack?: number
  opensecrets?: string
  votesmart?: number
  fec?: string[]
  cspan?: number
  wikipedia?: string
  house_history?: number
  ballotpedia?: string
  maplight?: number
  icpsr?: number
  wikidata?: string
}

export interface CongressLegislatorName {
  first: string
  middle?: string
  last: string
  suffix?: string
  nickname?: string
  official_full?: string
}

export interface CongressLegislatorBio {
  birthday?: string
  gender: 'M' | 'F'
  religion?: string
}

export interface CongressLegislatorTerm {
  type: 'rep' | 'sen'
  start: string
  end: string
  state: string
  district?: number
  party: string
  caucus?: string
  state_rank?: 'junior' | 'senior'
  url?: string
  address?: string
  phone?: string
  fax?: string
  contact_form?: string
  office?: string
  rss_url?: string
  class?: number
}

export interface CongressLegislatorLeadership {
  title: string
  start: string
  end?: string
}

export interface CongressLegislator {
  id: CongressLegislatorId
  name: CongressLegislatorName
  bio: CongressLegislatorBio
  terms: CongressLegislatorTerm[]
  leadership_roles?: CongressLegislatorLeadership[]
}

export interface CongressLegislatorSocialMedia {
  bioguide: string
  social?: {
    twitter?: string
    twitter_id?: string
    facebook?: string
    facebook_id?: string
    youtube?: string
    youtube_id?: string
    instagram?: string
    instagram_id?: string
    mastodon?: string
  }
}


/**
 * Fetch current legislators data
 */
async function fetchCurrentLegislators(): Promise<CongressLegislator[]> {
  return cachedFetch(
    'congress-legislators-current',
    async () => {
      try {
        structuredLogger.info('Fetching current legislators from congress-legislators')
        
        const response = await fetch(`${CONGRESS_LEGISLATORS_BASE_URL}/legislators-current.yaml`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch legislators: ${response.status} ${response.statusText}`)
        }
        
        const yamlText = await response.text()
        
        // Parse YAML (simplified parser for this specific format)
        const legislators = parseCongressLegilatorsYAML(yamlText)
        
        structuredLogger.info('Successfully fetched current legislators', {
          count: legislators.length
        })
        
        return legislators
      } catch (error) {
        structuredLogger.error('Error fetching current legislators', error as Error)
        return []
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache - data doesn't change frequently
  )
}

/**
 * Fetch social media data
 */
async function fetchSocialMediaData(): Promise<CongressLegislatorSocialMedia[]> {
  return cachedFetch(
    'congress-legislators-social-media',
    async () => {
      try {
        structuredLogger.info('Fetching social media data from congress-legislators')
        
        const response = await fetch(`${CONGRESS_LEGISLATORS_BASE_URL}/legislators-social-media.yaml`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch social media: ${response.status} ${response.statusText}`)
        }
        
        const yamlText = await response.text()
        
        // Parse YAML for social media data
        const socialMedia = parseSocialMediaYAML(yamlText)
        
        structuredLogger.info('Successfully fetched social media data', {
          count: socialMedia.length
        })
        
        return socialMedia
      } catch (error) {
        structuredLogger.error('Error fetching social media data', error as Error)
        return []
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache
  )
}

/**
 * Parse YAML data for congress-legislators format
 */
function parseCongressLegilatorsYAML(yamlText: string): CongressLegislator[] {
  try {
    const data = yaml.load(yamlText) as CongressLegislator[]
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of legislators')
    }
    
    structuredLogger.info('Successfully parsed congress legislators YAML', {
      count: data.length
    })
    
    return data
  } catch (error) {
    structuredLogger.error('Error parsing congress legislators YAML', error as Error)
    return []
  }
}

/**
 * Parse YAML data for social media format
 */
function parseSocialMediaYAML(yamlText: string): CongressLegislatorSocialMedia[] {
  try {
    const data = yaml.load(yamlText) as CongressLegislatorSocialMedia[]
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of social media entries')
    }
    
    structuredLogger.info('Successfully parsed social media YAML', {
      count: data.length
    })
    
    return data
  } catch (error) {
    structuredLogger.error('Error parsing social media YAML', error as Error)
    return []
  }
}

/**
 * Get enhanced representative data by bioguide ID
 */
export async function getEnhancedRepresentative(bioguideId: string): Promise<EnhancedRepresentative | null> {
  try {
    const [legislators, socialMedia] = await Promise.all([
      fetchCurrentLegislators(),
      fetchSocialMediaData()
    ])
    
    // Find the legislator by bioguide ID
    const legislator = legislators.find(l => l.id.bioguide === bioguideId)
    if (!legislator) {
      structuredLogger.warn('Legislator not found in congress-legislators data', { bioguideId })
      return null
    }
    
    // Find social media data
    const social = socialMedia.find(s => s.bioguide === bioguideId)
    
    // Get current term (most recent)
    const currentTerm = legislator.terms[legislator.terms.length - 1]
    
    // Build enhanced representative object
    const enhanced: EnhancedRepresentative = {
      bioguideId: legislator.id.bioguide,
      name: `${legislator.name.first} ${legislator.name.last}`,
      party: currentTerm.party,
      state: currentTerm.state,
      district: currentTerm.district,
      
      fullName: {
        first: legislator.name.first,
        middle: legislator.name.middle,
        last: legislator.name.last,
        suffix: legislator.name.suffix,
        nickname: legislator.name.nickname,
        official: legislator.name.official_full
      },
      
      bio: {
        birthday: legislator.bio.birthday,
        gender: legislator.bio.gender,
        religion: legislator.bio.religion
      },
      
      currentTerm: {
        start: currentTerm.start,
        end: currentTerm.end,
        office: currentTerm.office,
        phone: currentTerm.phone,
        address: currentTerm.address,
        website: currentTerm.url,
        contactForm: currentTerm.contact_form,
        rssUrl: currentTerm.rss_url,
        stateRank: currentTerm.state_rank,
        class: currentTerm.class
      },
      
      socialMedia: social?.social ? {
        twitter: social.social.twitter,
        facebook: social.social.facebook,
        youtube: social.social.youtube,
        instagram: social.social.instagram,
        mastodon: social.social.mastodon
      } : undefined,
      
      ids: {
        govtrack: legislator.id.govtrack,
        opensecrets: legislator.id.opensecrets,
        votesmart: legislator.id.votesmart,
        fec: legislator.id.fec,
        cspan: legislator.id.cspan,
        wikipedia: legislator.id.wikipedia,
        wikidata: legislator.id.wikidata,
        ballotpedia: legislator.id.ballotpedia
      },
      
      leadershipRoles: legislator.leadership_roles
    }
    
    structuredLogger.info('Successfully enhanced representative data', {
      bioguideId,
      hasIds: !!enhanced.ids,
      hasSocialMedia: !!enhanced.socialMedia,
      hasCurrentTerm: !!enhanced.currentTerm
    })
    
    return enhanced
  } catch (error) {
    structuredLogger.error('Error getting enhanced representative', error as Error, { bioguideId })
    return null
  }
}

/**
 * Get all enhanced representatives
 */
export async function getAllEnhancedRepresentatives(): Promise<EnhancedRepresentative[]> {
  try {
    const [legislators, socialMedia] = await Promise.all([
      fetchCurrentLegislators(),
      fetchSocialMediaData()
    ])
    
    const enhanced = legislators.map(legislator => {
      const bioguideId = legislator.id.bioguide
      const social = socialMedia.find(s => s.bioguide === bioguideId)
      const currentTerm = legislator.terms[legislator.terms.length - 1]
      
      return {
        bioguideId: legislator.id.bioguide,
        name: `${legislator.name.first} ${legislator.name.last}`,
        party: currentTerm.party,
        state: currentTerm.state,
        district: currentTerm.district,
        
        fullName: {
          first: legislator.name.first,
          middle: legislator.name.middle,
          last: legislator.name.last,
          suffix: legislator.name.suffix,
          nickname: legislator.name.nickname,
          official: legislator.name.official_full
        },
        
        bio: {
          birthday: legislator.bio.birthday,
          gender: legislator.bio.gender,
          religion: legislator.bio.religion
        },
        
        currentTerm: {
          start: currentTerm.start,
          end: currentTerm.end,
          office: currentTerm.office,
          phone: currentTerm.phone,
          address: currentTerm.address,
          website: currentTerm.url,
          contactForm: currentTerm.contact_form,
          rssUrl: currentTerm.rss_url,
          stateRank: currentTerm.state_rank,
          class: currentTerm.class
        },
        
        socialMedia: social?.social ? {
          twitter: social.social.twitter,
          facebook: social.social.facebook,
          youtube: social.social.youtube,
          instagram: social.social.instagram,
          mastodon: social.social.mastodon
        } : undefined,
        
        ids: {
          govtrack: legislator.id.govtrack,
          opensecrets: legislator.id.opensecrets,
          votesmart: legislator.id.votesmart,
          fec: legislator.id.fec,
          cspan: legislator.id.cspan,
          wikipedia: legislator.id.wikipedia,
          wikidata: legislator.id.wikidata,
          ballotpedia: legislator.id.ballotpedia
        },
        
        leadershipRoles: legislator.leadership_roles
      }
    })
    
    structuredLogger.info('Successfully got all enhanced representatives', {
      count: enhanced.length
    })
    
    return enhanced
  } catch (error) {
    structuredLogger.error('Error getting all enhanced representatives', error as Error)
    return []
  }
}

/**
 * Get OpenSecrets ID for improved FEC matching
 */
export function getOpenSecretsId(bioguideId: string, enhanced?: EnhancedRepresentative): string | null {
  if (enhanced?.ids?.opensecrets) {
    return enhanced.ids.opensecrets
  }
  
  // Could also fetch this individually if needed
  return null
}

/**
 * Get FEC IDs from congress-legislators data
 */
export function getFECIds(bioguideId: string, enhanced?: EnhancedRepresentative): string[] {
  if (enhanced?.ids?.fec) {
    return enhanced.ids.fec
  }
  
  return []
}