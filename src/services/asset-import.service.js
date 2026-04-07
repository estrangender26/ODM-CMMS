/**
 * Asset Bulk Import Service
 * Handles CSV import of facilities and assets with template inheritance
 */

const fs = require('fs');
const { Equipment, TaskTemplate } = require('../models');
const db = require('../config/database');

class AssetImportService {
  constructor() {
    this.equipmentModel = Equipment; // Already instantiated
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      facilitiesCreated: 0,
      assetsCreated: 0,
      templatesLinked: 0,
      errors: [],
      facilitiesCreatedList: [],
      assetsCreatedList: []
    };
  }

  /**
   * Main import function
   * @param {string} filePath - Path to CSV file
   * @param {number} importUserId - User performing import
   * @returns {Promise<Object>} Import results
   */
  async importFromCSV(filePath, importUserId) {
    this.resetResults();
    
    // Lazy require csv-parser
    const csv = require('csv-parser');
    
    return new Promise((resolve, reject) => {
      const rows = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', async () => {
          try {
            await this.processRows(rows, importUserId);
            resolve(this.results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Process array of CSV rows
   */
  async processRows(rows, importUserId) {
    this.results.total = rows.length;
    
    // Track facilities created in this import
    const facilityCache = new Map();
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row and 0-index
      
      try {
        await this.processRow(row, rowNum, importUserId, facilityCache);
        this.results.success++;
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({
          row: rowNum,
          asset_name: row.asset_name || 'N/A',
          facility: row.facility_name || 'N/A',
          error: error.message
        });
        console.error(`[Import] Row ${rowNum} failed:`, error.message);
      }
    }
  }

  /**
   * Process single row
   */
  async processRow(row, rowNum, importUserId, facilityCache) {
    // 1. Validate required fields
    this.validateRequiredFields(row, rowNum);
    
    // 2. Validate organization
    const organization = await this.validateOrganization(row.organization_id);
    
    // 3. Get or create facility
    const facility = await this.getOrCreateFacility(
      row.facility_name, 
      organization.id, 
      facilityCache,
      importUserId
    );
    
    // 4. Validate equipment type
    const equipmentType = await this.validateEquipmentType(row.equipment_type_code);
    
    // 5. Check duplicate asset name in facility
    await this.checkDuplicateAsset(row.asset_name, facility.id, organization.id);
    
    // 6. Validate optional fields
    const optionalData = this.validateOptionalFields(row);
    
    // 7. Generate codes
    const assetCode = this.generateAssetCode(row.asset_name);
    const qrCode = this.generateQRCode(organization.code, facility.code, assetCode);
    
    // 8. Create asset
    const asset = await this.createAsset({
      organization_id: organization.id,
      facility_id: facility.id,
      name: row.asset_name.trim(),
      code: assetCode,
      equipment_type_id: equipmentType.id,
      description: optionalData.description,
      manufacturer: optionalData.manufacturer,
      model: optionalData.model,
      serial_number: optionalData.serial_number,
      install_date: optionalData.commission_date,
      criticality: optionalData.criticality,
      status: 'operational',
      qr_code: qrCode,
      created_by: importUserId
    });
    
    this.results.assetsCreated++;
    this.results.assetsCreatedList.push({
      name: asset.name,
      facility: facility.name,
      code: assetCode
    });
    
    // 9. Inherit templates
    const templateCount = await this.inheritTemplates(asset, equipmentType.id);
    this.results.templatesLinked += templateCount;
    
    console.log(`[Import] Row ${rowNum}: Created asset ${asset.name} with ${templateCount} templates`);
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(row, rowNum) {
    const required = ['organization_id', 'facility_name', 'asset_name', 'equipment_type_code'];
    
    for (const field of required) {
      if (!row[field] || row[field].trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate organization exists
   */
  async validateOrganization(orgCode) {
    const sql = `SELECT id, code FROM organizations WHERE code = ? AND is_active = TRUE`;
    const [org] = await db.query(sql, [orgCode.trim()]);
    
    if (!org) {
      throw new Error(`Organization '${orgCode}' not found or inactive`);
    }
    
    return org;
  }

  /**
   * Get existing facility or create new one
   */
  async getOrCreateFacility(facilityName, organizationId, facilityCache, importUserId) {
    const cacheKey = `${organizationId}:${facilityName.toLowerCase().trim()}`;
    
    // Check cache first
    if (facilityCache.has(cacheKey)) {
      return facilityCache.get(cacheKey);
    }
    
    // Try to find existing facility (case-insensitive)
    const sql = `
      SELECT id, name, code 
      FROM facilities 
      WHERE organization_id = ? 
        AND LOWER(name) = LOWER(?)
    `;
    const [existing] = await db.query(sql, [organizationId, facilityName.trim()]);
    
    if (existing) {
      facilityCache.set(cacheKey, existing);
      return existing;
    }
    
    // Create new facility
    const facilityCode = this.generateFacilityCode(facilityName);
    const insertSql = `
      INSERT INTO facilities (organization_id, name, code, status, created_by, created_at)
      VALUES (?, ?, ?, 'active', ?, NOW())
    `;
    const result = await db.query(insertSql, [
      organizationId, 
      facilityName.trim(), 
      facilityCode,
      importUserId
    ]);
    
    const newFacility = {
      id: result.insertId,
      name: facilityName.trim(),
      code: facilityCode
    };
    
    facilityCache.set(cacheKey, newFacility);
    this.results.facilitiesCreated++;
    this.results.facilitiesCreatedList.push(facilityName.trim());
    
    console.log(`[Import] Created facility: ${facilityName} (${facilityCode})`);
    return newFacility;
  }

  /**
   * Validate equipment type code exists in taxonomy
   */
  async validateEquipmentType(typeCode) {
    const sql = `
      SELECT id, type_code, type_name 
      FROM equipment_types 
      WHERE LOWER(type_code) = LOWER(?)
    `;
    const [type] = await db.query(sql, [typeCode.trim()]);
    
    if (!type) {
      throw new Error(`Equipment type '${typeCode}' not found in ISO 14224 taxonomy`);
    }
    
    return type;
  }

  /**
   * Check for duplicate asset name in facility
   */
  async checkDuplicateAsset(assetName, facilityId, organizationId) {
    const sql = `
      SELECT id 
      FROM equipment 
      WHERE organization_id = ? 
        AND facility_id = ?
        AND LOWER(name) = LOWER(?)
    `;
    const [existing] = await db.query(sql, [organizationId, facilityId, assetName.trim()]);
    
    if (existing) {
      throw new Error(`Asset '${assetName}' already exists in this facility`);
    }
  }

  /**
   * Validate optional fields
   */
  validateOptionalFields(row) {
    const data = {
      description: row.asset_description?.trim() || null,
      manufacturer: row.manufacturer?.trim() || null,
      model: row.model?.trim() || null,
      serial_number: row.serial_number?.trim() || null,
      criticality: 'medium'
    };
    
    // Validate commission_date
    if (row.commission_date && row.commission_date.trim() !== '') {
      const date = new Date(row.commission_date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid commission_date format: ${row.commission_date}`);
      }
      if (date > new Date()) {
        throw new Error('commission_date cannot be in the future');
      }
      data.commission_date = row.commission_date;
    }
    
    // Validate criticality
    if (row.criticality && row.criticality.trim() !== '') {
      const valid = ['low', 'medium', 'high', 'critical'];
      if (!valid.includes(row.criticality.toLowerCase())) {
        throw new Error(`Invalid criticality: ${row.criticality}. Use: low, medium, high, critical`);
      }
      data.criticality = row.criticality.toLowerCase();
    }
    
    return data;
  }

  /**
   * Generate asset code from name
   */
  generateAssetCode(name) {
    // Create URL-safe slug from name
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate facility code from name
   */
  generateFacilityCode(name) {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 4).toUpperCase();
    }
    // Use first letter of each word
    return words.map(w => w[0]).join('').toUpperCase();
  }

  /**
   * Generate QR code
   * Stores asset code only for stable, org-agnostic scanning
   */
  generateQRCode(orgCode, facilityCode, assetCode) {
    return assetCode;
  }

  /**
   * Create asset record
   */
  async createAsset(assetData) {
    const sql = `
      INSERT INTO equipment (
        organization_id, facility_id, name, code, equipment_type_id,
        description, manufacturer, model, serial_number, install_date,
        criticality, status, qr_code, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const result = await db.query(sql, [
      assetData.organization_id,
      assetData.facility_id,
      assetData.name,
      assetData.code,
      assetData.equipment_type_id,
      assetData.description,
      assetData.manufacturer,
      assetData.model,
      assetData.serial_number,
      assetData.install_date,
      assetData.criticality,
      assetData.status,
      assetData.qr_code,
      assetData.created_by
    ]);
    
    return { ...assetData, id: result.insertId };
  }

  /**
   * Inherit templates based on equipment_type
   */
  async inheritTemplates(asset, equipmentTypeId) {
    // Find active templates for this equipment type
    const sql = `
      SELECT id 
      FROM task_templates 
      WHERE equipment_type_id = ?
        AND is_active = TRUE
        AND (organization_id IS NULL OR organization_id = ?)
    `;
    
    const templates = await db.query(sql, [equipmentTypeId, asset.organization_id]);
    
    if (templates.length === 0) {
      console.log(`[Import] No templates found for equipment type ${equipmentTypeId}`);
      return 0;
    }
    
    // Link asset to templates
    const linkSql = `
      INSERT INTO asset_template_links 
      (asset_id, template_id, inherited_at, inherited_from, created_at)
      VALUES (?, ?, NOW(), 'equipment_type', NOW())
      ON DUPLICATE KEY UPDATE inherited_at = NOW()
    `;
    
    for (const template of templates) {
      await db.query(linkSql, [asset.id, template.id]);
    }
    
    return templates.length;
  }

  /**
   * Reset results for new import
   */
  resetResults() {
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      facilitiesCreated: 0,
      assetsCreated: 0,
      templatesLinked: 0,
      errors: [],
      facilitiesCreatedList: [],
      assetsCreatedList: []
    };
  }

  /**
   * Validate CSV headers
   */
  validateHeaders(headers) {
    const required = ['organization_id', 'facility_name', 'asset_name', 'equipment_type_code'];
    const missing = required.filter(h => !headers.includes(h));
    
    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = new AssetImportService();
