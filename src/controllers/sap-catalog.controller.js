/**
 * SAP Catalog Controller
 * SAP S/4HANA PM-compatible catalog management
 * 
 * Catalog A - Object Parts
 * Catalog B - Damage Codes
 * Catalog C - Cause Codes
 * Catalog 5 - Activity Codes
 */

const { ObjectPart, DamageCode, CauseCode, ActivityCode, SapCatalogService } = require('../models');

/**
 * Get all catalogs (complete reference)
 */
const getAllCatalogs = async (req, res, next) => {
  try {
    const catalogs = await SapCatalogService.getCompleteCatalogReference();
    
    res.json({
      success: true,
      data: { catalogs }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get catalog by type
 */
const getCatalogByType = async (req, res, next) => {
  try {
    const { catalogType } = req.params;
    const { equipment_class_id, category, search } = req.query;
    
    let data;
    
    switch (catalogType.toLowerCase()) {
      case 'a':
      case 'object-parts':
      case 'object_parts':
        if (equipment_class_id) {
          data = await ObjectPart.getByEquipmentClass(equipment_class_id);
        } else if (search) {
          data = await ObjectPart.search(search);
        } else {
          data = await ObjectPart.getAllActiveWithDetails();
        }
        break;
        
      case 'b':
      case 'damage-codes':
      case 'damage_codes':
      case 'damage':
        if (equipment_class_id) {
          data = await DamageCode.getByEquipmentClass(equipment_class_id);
        } else if (search) {
          data = await DamageCode.search(search);
        } else {
          data = await DamageCode.getAllActiveWithDetails();
        }
        break;
        
      case 'c':
      case 'cause-codes':
      case 'cause_codes':
      case 'cause':
        if (category) {
          data = await CauseCode.getByCategory(category);
        } else if (search) {
          data = await CauseCode.search(search);
        } else {
          data = await CauseCode.getAllActiveWithDetails();
        }
        break;
        
      case '5':
      case 'activity-codes':
      case 'activity_codes':
      case 'activity':
        if (category) {
          data = await ActivityCode.getByCategory(category);
        } else if (search) {
          data = await ActivityCode.search(search);
        } else {
          data = await ActivityCode.getAllActive();
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid catalog type. Must be one of: a, b, c, 5, object-parts, damage-codes, cause-codes, activity-codes'
        });
    }
    
    res.json({
      success: true,
      data: { 
        catalog_type: catalogType,
        items: data
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific catalog item
 */
const getCatalogItem = async (req, res, next) => {
  try {
    const { catalogType, id } = req.params;
    
    let item;
    
    switch (catalogType.toLowerCase()) {
      case 'a':
      case 'object-parts':
      case 'object_parts':
        item = await ObjectPart.getWithDetails(id);
        break;
        
      case 'b':
      case 'damage-codes':
      case 'damage_codes':
      case 'damage':
        item = await DamageCode.getWithDetails(id);
        break;
        
      case 'c':
      case 'cause-codes':
      case 'cause_codes':
      case 'cause':
        item = await CauseCode.getWithDetails(id);
        break;
        
      case '5':
      case 'activity-codes':
      case 'activity_codes':
      case 'activity':
        item = await ActivityCode.findById(id);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid catalog type'
        });
    }
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }
    
    res.json({
      success: true,
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get activity code by code
 */
const getActivityCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    const item = await ActivityCode.getByCode(code);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Activity code not found'
      });
    }
    
    res.json({
      success: true,
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get catalogs for finding form (equipment class specific)
 */
const getCatalogsForFinding = async (req, res, next) => {
  try {
    const { equipmentClassId } = req.params;
    
    const catalogs = await SapCatalogService.getCatalogOptionsForFinding(equipmentClassId);
    
    res.json({
      success: true,
      data: { 
        equipment_class_id: equipmentClassId,
        catalogs
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCatalogs,
  getCatalogByType,
  getCatalogItem,
  getActivityCode,
  getCatalogsForFinding
};
