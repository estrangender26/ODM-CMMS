/**
 * Subunit and Maintainable Item Controller
 * ISO 14224 Level 4 (Subunits) and Level 5 (Maintainable Items)
 */

const { Subunit, MaintainableItem, EquipmentType } = require('../models');

// ==================== SUBUNITS ====================

/**
 * Get all subunits
 */
const getAllSubunits = async (req, res, next) => {
  try {
    const subunits = await Subunit.getAllWithDetails();
    
    res.json({
      success: true,
      data: { subunits }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subunit by ID
 */
const getSubunitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const subunit = await Subunit.getWithHierarchy(id);
    
    if (!subunit) {
      return res.status(404).json({
        success: false,
        message: 'Subunit not found'
      });
    }
    
    // Get maintainable items for this subunit
    const items = await MaintainableItem.getBySubunit(id);
    
    res.json({
      success: true,
      data: { 
        subunit: {
          ...subunit,
          maintainable_items: items
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subunits by equipment type
 */
const getSubunitsByEquipmentType = async (req, res, next) => {
  try {
    const { equipmentTypeId } = req.params;
    
    // Verify equipment type exists
    const equipType = await EquipmentType.getFullHierarchy(equipmentTypeId);
    if (!equipType) {
      return res.status(404).json({
        success: false,
        message: 'Equipment type not found'
      });
    }
    
    const subunits = await Subunit.getWithItemCount(equipmentTypeId);
    
    res.json({
      success: true,
      data: { 
        equipment_type: equipType,
        subunits
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search subunits
 */
const searchSubunits = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const subunits = await Subunit.search(q);
    
    res.json({
      success: true,
      data: { subunits }
    });
  } catch (error) {
    next(error);
  }
};

// ==================== MAINTAINABLE ITEMS ====================

/**
 * Get all maintainable items
 */
const getAllItems = async (req, res, next) => {
  try {
    const items = await MaintainableItem.getAllWithDetails();
    
    res.json({
      success: true,
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get maintainable item by ID
 */
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const item = await MaintainableItem.getWithHierarchy(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Maintainable item not found'
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
 * Get maintainable items by subunit
 */
const getItemsBySubunit = async (req, res, next) => {
  try {
    const { subunitId } = req.params;
    
    // Verify subunit exists
    const subunit = await Subunit.getWithHierarchy(subunitId);
    if (!subunit) {
      return res.status(404).json({
        success: false,
        message: 'Subunit not found'
      });
    }
    
    const items = await MaintainableItem.getBySubunit(subunitId);
    
    res.json({
      success: true,
      data: { 
        subunit: {
          id: subunit.id,
          subunit_code: subunit.subunit_code,
          subunit_name: subunit.subunit_name
        },
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get maintainable items by equipment type
 */
const getItemsByEquipmentType = async (req, res, next) => {
  try {
    const { equipmentTypeId } = req.params;
    
    // Verify equipment type exists
    const equipType = await EquipmentType.getFullHierarchy(equipmentTypeId);
    if (!equipType) {
      return res.status(404).json({
        success: false,
        message: 'Equipment type not found'
      });
    }
    
    const items = await MaintainableItem.getByEquipmentType(equipmentTypeId);
    
    res.json({
      success: true,
      data: { 
        equipment_type: equipType,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search maintainable items
 */
const searchItems = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const items = await MaintainableItem.search(q);
    
    res.json({
      success: true,
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get maintainable items by criticality
 */
const getItemsByCriticality = async (req, res, next) => {
  try {
    const { level } = req.params;
    
    const validLevels = ['low', 'medium', 'high', 'critical'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: `Invalid criticality level. Must be one of: ${validLevels.join(', ')}`
      });
    }
    
    const items = await MaintainableItem.getByCriticality(level);
    
    res.json({
      success: true,
      data: { 
        criticality: level,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Subunits
  getAllSubunits,
  getSubunitById,
  getSubunitsByEquipmentType,
  searchSubunits,
  // Maintainable Items
  getAllItems,
  getItemById,
  getItemsBySubunit,
  getItemsByEquipmentType,
  searchItems,
  getItemsByCriticality
};
