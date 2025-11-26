const Form = require("../models/Form");

const getAllForms = async (req, res) => {
  try {
    const { activeOnly, includeDeleted } = req.query;
    const query = { isDeleted: false }; // Exclude soft-deleted forms by default

    if (activeOnly === "true") {
      query.isActive = true;
    }

    // Admin can include deleted forms if requested
    if (includeDeleted === "true") {
      delete query.isDeleted;
    }

    const forms = await Form.find(query).sort({ createdAt: -1 });
    res.json(forms);
  } catch (error) {
    res.status(500).json({ error: "Error fetching forms" });
  }
};

const getFormById = async (req, res) => {
  try {
    const form = await Form.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: "Error fetching form" });
  }
};

const createForm = async (req, res) => {
  try {
    const { title, description, fields } = req.body;

    // Sort fields by order
    const sortedFields = [...fields].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    // Process fields to ensure proper structure and remove temporary IDs
    const processedFields = sortedFields.map((field) => {
      // Create a clean field object without temporary IDs
      // Remove _id and _dragId which are temporary IDs from frontend
      const { _id, _dragId, ...cleanField } = field;
      
      const processedField = {
        label: cleanField.label,
        name: cleanField.name,
        type: cleanField.type,
        required: cleanField.required || false,
        options: Array.isArray(cleanField.options) ? cleanField.options : [],
        conditionalFields: cleanField.conditionalFields || {},
        validation: cleanField.validation || {},
        order: cleanField.order || 0
      };

      // Ensure conditionalFields is an object
      if (!processedField.conditionalFields || typeof processedField.conditionalFields !== 'object' || Array.isArray(processedField.conditionalFields)) {
        processedField.conditionalFields = {};
      }

      // Ensure validation is an object
      if (!processedField.validation || typeof processedField.validation !== 'object' || Array.isArray(processedField.validation)) {
        processedField.validation = {};
      }

      // Ensure options is an array
      if (!Array.isArray(processedField.options)) {
        processedField.options = [];
      }

      return processedField;
    });

    const form = new Form({
      title,
      description: description || "",
      fields: processedFields,
    });

    await form.save();
    res.status(201).json(form);
  } catch (error) {
    console.error("Error creating form:", error);
    if (error.message.includes("unique")) {
      return res.status(400).json({ error: error.message });
    }
    // Return detailed error in development, generic in production
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Error creating form: ${error.message}`
        : "Error creating form";
    res
      .status(500)
      .json({
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
  }
};

const updateForm = async (req, res) => {
  try {
    const { title, description, fields, isActive } = req.body;

    const form = await Form.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (title !== undefined) form.title = title;
    if (description !== undefined) form.description = description;
    if (isActive !== undefined) form.isActive = isActive;

    if (fields !== undefined) {
      const sortedFields = [...fields].sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );

      // Process fields to ensure proper structure and remove temporary IDs
      const processedFields = sortedFields.map((field) => {
        // Remove temporary IDs (_id, _dragId) that frontend sends
        // For updates, Mongoose will preserve existing _id if field already exists in DB
        const { _id, _dragId, ...cleanField } = field;
        
        const processedField = {
          label: cleanField.label,
          name: cleanField.name,
          type: cleanField.type,
          required: cleanField.required || false,
          options: Array.isArray(cleanField.options) ? cleanField.options : [],
          conditionalFields: cleanField.conditionalFields || {},
          validation: cleanField.validation || {},
          order: cleanField.order || 0
        };

        // Note: _id is disabled in fieldSchema, so we don't preserve it
        // Mongoose will handle field matching based on array position during updates

        // Ensure conditionalFields is an object
        if (!processedField.conditionalFields || typeof processedField.conditionalFields !== 'object' || Array.isArray(processedField.conditionalFields)) {
          processedField.conditionalFields = {};
        }

        // Ensure validation is an object
        if (!processedField.validation || typeof processedField.validation !== 'object' || Array.isArray(processedField.validation)) {
          processedField.validation = {};
        }

        // Ensure options is an array
        if (!Array.isArray(processedField.options)) {
          processedField.options = [];
        }

        return processedField;
      });

      // Increment version when fields are updated
      if (JSON.stringify(form.fields) !== JSON.stringify(processedFields)) {
        form.version = (form.version || 1) + 1;
      }
      form.fields = processedFields;
    }

    await form.save();
    res.json(form);
  } catch (error) {
    console.error("Error updating form:", error);
    if (error.message.includes("unique")) {
      return res.status(400).json({ error: error.message });
    }
    // Return detailed error in development, generic in production
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Error updating form: ${error.message}`
        : "Error updating form";
    res
      .status(500)
      .json({
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
  }
};

const deleteForm = async (req, res) => {
  try {
    const form = await Form.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Soft delete: mark as deleted instead of removing from database
    form.isDeleted = true;
    form.deletedAt = new Date();
    // Also deactivate the form when deleted
    form.isActive = false;
    await form.save();

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting form" });
  }
};

const restoreForm = async (req, res) => {
  try {
    const form = await Form.findOne({
      _id: req.params.id,
      isDeleted: true,
    });

    if (!form) {
      return res.status(404).json({ error: "Deleted form not found" });
    }

    // Restore the form
    form.isDeleted = false;
    form.deletedAt = null;
    await form.save();

    res.json({ message: "Form restored successfully", form });
  } catch (error) {
    res.status(500).json({ error: "Error restoring form" });
  }
};

module.exports = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  restoreForm,
};
