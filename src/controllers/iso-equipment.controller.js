/**
 * ISO 14224 Equipment Classification Controller
 * Global reference data for equipment taxonomy
 */

const { 
  EquipmentCategory, 
  EquipmentClass, 
  EquipmentType,
  FailureMode 
} = require('../models');

/**
 * Get all equipment categories (global reference)
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await EquipmentCategory.findAll({}, { orderBy: 'category_name' });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment classes by category
 */
const getClassesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    const classes = await EquipmentClass.findByCategory(categoryId);
    
    res.json({
      success: true,
      data: { classes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment types by class
 */
const getTypesByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const types = await EquipmentType.findByClass(classId);
    
    res.json({
      success: true,
      data: { types }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full hierarchy (category > class > type)
 */
const getFullHierarchy = async (req, res, next) => {
  try {
    const hierarchy = await EquipmentCategory.getFullHierarchy();
    
    // Group by category
    const grouped = hierarchy.reduce((acc, row) => {
      const catKey = row.category_id;
      if (!acc[catKey]) {
        acc[catKey] = {
          id: row.category_id,
          code: row.category_code,
          name: row.category_name,
          description: row.category_description,
          classes: {}
        };
      }
      
      if (row.class_id) {
        const classKey = row.class_id;
        if (!acc[catKey].classes[classKey]) {
          acc[catKey].classes[classKey] = {
            id: row.class_id,
            code: row.class_code,
            name: row.class_name,
            description: row.class_description,
            types: []
          };
        }
        
        if (row.type_id) {
          acc[catKey].classes[classKey].types.push({
            id: row.type_id,
            code: row.type_code,
            name: row.type_name,
            description: row.type_description
          });
        }
      }
      
      return acc;
    }, {});
    
    // Convert to array and nested objects to arrays
    const result = Object.values(grouped).map(cat => ({
      ...cat,
      classes: Object.values(cat.classes)
    }));
    
    res.json({
      success: true,
      data: { hierarchy: result }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment type with full details
 */
const getTypeDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const type = await EquipmentType.getFullHierarchy(id);
    
    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Equipment type not found'
      });
    }
    
    // Get failure modes
    const failureModes = await FailureMode.findByEquipmentType(id);
    
    res.json({
      success: true,
      data: { 
        type,
        failure_modes: failureModes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search equipment types
 */
const searchTypes = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const types = await EquipmentType.search(q);
    
    res.json({
      success: true,
      data: { types }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all types with hierarchy (flat list for dropdowns)
 */
const getAllTypes = async (req, res, next) => {
  try {
    const types = await EquipmentType.getAllWithHierarchy();
    
    res.json({
      success: true,
      data: { types }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get failure modes by equipment type
 */
const getFailureModes = async (req, res, next) => {
  try {
    const { typeId } = req.params;
    
    const failureModes = await FailureMode.findByEquipmentType(typeId);
    
    res.json({
      success: true,
      data: { failure_modes: failureModes }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getClassesByCategory,
  getTypesByClass,
  getFullHierarchy,
  getTypeDetails,
  searchTypes,
  getAllTypes,
  getFailureModes
};
