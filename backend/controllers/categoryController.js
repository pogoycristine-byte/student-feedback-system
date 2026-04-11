const Category = require('../models/Category');

// @desc    Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { isActive } = req.query;
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    const categories = await Category.find(query)
      .populate('createdBy', 'name')
      .sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create new category (Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide category name' });
    }

    // ✅ ADDED: length limits
    if (name.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Category name must be under 100 characters' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ success: false, message: 'Description must be under 500 characters' });
    }

    // ✅ ADDED: icon length validation to prevent script injection via icon field
    if (icon && icon.length > 10) {
      return res.status(400).json({ success: false, message: 'Invalid icon value' });
    }

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      description: description || '',
      icon: icon || '📝',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update category (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, icon, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // ✅ ADDED: length limits on update
    if (name && name.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Category name must be under 100 characters' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ success: false, message: 'Description must be under 500 characters' });
    }

    // ✅ ADDED: icon length validation on update
    if (icon && icon.length > 10) {
      return res.status(400).json({ success: false, message: 'Invalid icon value' });
    }

    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete category (Admin)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const Feedback = require('../models/Feedback');
    const feedbackCount = await Feedback.countDocuments({ category: req.params.id });
    if (feedbackCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is being used by ${feedbackCount} feedback(s). Consider deactivating instead.`
      });
    }

    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};